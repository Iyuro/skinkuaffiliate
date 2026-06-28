// server/impl/telegram-webhook.js (moved from api)
const { getSupabase } = require('./_supabase');
const { getStatus, getSaran, isGhost, mergeRows, fmtRp, DEFAULT_SETTINGS } = require('./_creator-logic');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function tgCall(method, payload) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function sendMessage(chatId, text, keyboard) {
  return tgCall('sendMessage', {
    chat_id: chatId, text, parse_mode: 'Markdown',
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
  });
}

function editMessage(chatId, messageId, text, keyboard) {
  return tgCall('editMessageText', {
    chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown',
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
  });
}

function answerCallback(callbackQueryId, text) {
  return tgCall('answerCallbackQuery', { callback_query_id: callbackQueryId, text: text || undefined });
}

const MENU_KEYBOARD = [
  [{ text: '🌐 Buka Website', url: 'https://skinkuaffiliate-q94b.vercel.app/' }],
  [{ text: '📊 Ringkasan Hari Ini', callback_data: 'summary' }],
  [{ text: '🔥 Top Perform', callback_data: 'perform' }, { text: '👻 Ghost Kreator', callback_data: 'ghost' }],
  [{ text: '🔵 Rekomendasi Sampel', callback_data: 'rekomen' }, { text: '⏰ Kontrak Expire', callback_data: 'expiring' }],
  [{ text: '🔄 Refresh', callback_data: 'menu' }]
];
const BACK_KEYBOARD = [[{ text: '« Menu Utama', callback_data: 'menu' }]];

async function loadAllData() {
  const supabase = getSupabase();
  const { data: rawRows, error: rErr } = await supabase.from('creator_rows').select('*');
  if (rErr) throw new Error(rErr.message);

  const appRows = (rawRows || []).map(r => ({
    name: r.name, sampelDiminta: r.sampel_diminta || 0, sampelTerkirim: r.sampel_terkirim || 0,
    videoSampel: r.video_sampel || 0, liveSampel: r.live_sampel || 0, gmv: r.gmv || 0,
    roi45: r.roi45 || 0, roi90: r.roi90 || 0, orders: r.orders || 0, src: r.src || 'sample'
  }));
  const allData = mergeRows(appRows);

  const { data: exclusive, error: eErr } = await supabase.from('exclusive_creators').select('*');
  if (eErr) throw new Error(eErr.message);

  return { allData, exclusive: exclusive || [] };
}

async function buildSummary() {
  const { allData } = await loadAllData();
  if (!allData.length) return { text: '📊 *Ringkasan*\n\nBelum ada data yang diupload.', keyboard: BACK_KEYBOARD };
  const tGmv = allData.reduce((a, r) => a + r.gmv, 0);
  const tVideo = allData.reduce((a, r) => a + r.videoSampel, 0);
  const tSampel = allData.reduce((a, r) => a + r.sampelTerkirim, 0);
  const ghostCount = allData.filter(isGhost).length;
  const performCount = allData.filter(r => getStatus(r) === 'perform').length;
  const boncosCount = allData.filter(r => getStatus(r) === 'boncos').length;
  const text = `📊 *Ringkasan Hari Ini*\n\n` +
    `👥 Total Kreator: *${allData.length}*\n` +
    `💰 Total GMV: *${fmtRp(tGmv)}*\n` +
    `📦 Sampel Terkirim: *${tSampel}* pcs\n` +
    `🎬 Video Diposting: *${tVideo}*\n\n` +
    `🔥 Perform: *${performCount}*\n` +
    `❌ Boncos: *${boncosCount}*\n` +
    `👻 Ghost: *${ghostCount}*`;
  return { text, keyboard: BACK_KEYBOARD };
}

async function buildPerform() {
  const { allData } = await loadAllData();
  const top = allData.filter(r => getStatus(r) === 'perform').sort((a, b) => b.gmv - a.gmv).slice(0, 10);
  if (!top.length) return { text: '🔥 *Top Perform*\n\nBelum ada kreator perform.', keyboard: BACK_KEYBOARD };
  const lines = top.map((r, i) => `${i + 1}. [@${r.name}](https://www.tiktok.com/@${r.name}) — ${fmtRp(r.gmv)} (ROI ${r.roi45.toFixed(1)}x)`);
  return { text: `🔥 *Top Perform* (${top.length})\n\n${lines.join('\n')}`, keyboard: BACK_KEYBOARD };
}

async function buildGhost() {
  const { allData } = await loadAllData();
  const ghosts = allData.filter(isGhost);
  if (!ghosts.length) return { text: '👻 *Ghost Kreator*\n\n✅ Tidak ada ghost kreator saat ini!', keyboard: BACK_KEYBOARD };
  const lines = ghosts.slice(0, 15).map((r, i) => `${i + 1}. [@${r.name}](https://www.tiktok.com/@${r.name}) — dapat ${r.sampelTerkirim} sampel, 0 video`);
  const more = ghosts.length > 15 ? `\n\n_+${ghosts.length - 15} kreator ghost lainnya_` : '';
  return { text: `👻 *Ghost Kreator* (${ghosts.length})\n\n${lines.join('\n')}${more}`, keyboard: BACK_KEYBOARD };
}

async function buildRekomen() {
  const { allData } = await loadAllData();
  const rekomen = allData.filter(r => getStatus(r) === 'potential').sort((a, b) => b.gmv - a.gmv).slice(0, 10);
  if (!rekomen.length) return { text: '🔵 *Rekomendasi Kirim Sampel*\n\nBelum ada rekomendasi saat ini.', keyboard: BACK_KEYBOARD };
  const lines = rekomen.map((r, i) => `${i + 1}. [@${r.name}](https://www.tiktok.com/@${r.name}) — GMV organic ${fmtRp(r.gmv)}`);
  return { text: `🔵 *Rekomendasi Kirim Sampel* (${rekomen.length})\n\n${lines.join('\n')}`, keyboard: BACK_KEYBOARD };
}

async function buildExpiring() {
  const { exclusive } = await loadAllData();
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiring = exclusive.filter(e => e.expire && new Date(e.expire) >= now && new Date(e.expire) <= in7d);
  const expired = exclusive.filter(e => e.expire && new Date(e.expire) < now);
  if (!expiring.length && !expired.length) return { text: '⏰ *Kontrak/VIP*\n\n✅ Tidak ada kontrak yang mau/sudah expire.', keyboard: BACK_KEYBOARD };
  const lines = [];
  if (expired.length) lines.push('*🔴 Sudah Expired:*', ...expired.map(e => `• [@${e.username}](https://www.tiktok.com/@${e.username}) — expired ${e.expire}`), '');
  if (expiring.length) lines.push('*🟡 Mau Expire (≤7 hari):*', ...expiring.map(e => `• [@${e.username}](https://www.tiktok.com/@${e.username}) — expire ${e.expire}`));
  return { text: `⏰ *Kontrak/VIP*\n\n${lines.join('\n')}`, keyboard: BACK_KEYBOARD };
}

async function buildMenu() {
  return { text: '🤖 *Affiliate Analyzer Bot*\n\nMau lihat apa, bos?', keyboard: MENU_KEYBOARD };
}

const ROUTES = { menu: buildMenu, summary: buildSummary, perform: buildPerform, ghost: buildGhost, rekomen: buildRekomen, expiring: buildExpiring };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN belum diset');
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body || {};
    const incomingChatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    if (update.callback_query) {
      const cq = update.callback_query;
      const action = cq.data;
      const builder = ROUTES[action] || ROUTES.menu;
      answerCallback(cq.id).catch(() => {});
      try {
        const { text, keyboard } = await builder();
        await editMessage(cq.message.chat.id, cq.message.message_id, text, keyboard);
      } catch (err) {
        await editMessage(cq.message.chat.id, cq.message.message_id, `⚠️ Gagal ambil data: ${err.message}`, BACK_KEYBOARD);
      }
      return res.status(200).json({ ok: true });
    }

    if (update.message) {
      const incomingText = (update.message.text || '').trim();
      if (incomingText.startsWith('/start')) {
        try{
          const supabase = getSupabase();
          const chat_id = String(update.message.chat.id);
          const username = update.message.from && update.message.from.username ? update.message.from.username : null;
          await supabase.from('telegram_subscribers').upsert({ chat_id, username, subscribed: true, created_at: new Date().toISOString() }, { onConflict: ['chat_id'] });
          await sendMessage(update.message.chat.id, 'Terima kasih! Anda telah berhasil berlangganan notifikasi.');
          try{
            const menu = await buildMenu();
            await sendMessage(update.message.chat.id, menu.text, menu.keyboard);
          }catch(e){ }
        }catch(e){ console.error('subscribe error', e); }
        return res.status(200).json({ ok: true });
      }
      const { text: menuText, keyboard } = await buildMenu();
      await sendMessage(update.message.chat.id, menuText, keyboard);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ ok: true });
  }
};
