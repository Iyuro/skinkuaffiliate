// api/telegram-webhook.js
// Webhook bot Telegram 2-arah: orang ketik /start atau pesan apapun → bot kasih menu
// inline button → klik button → bot query Supabase → balas data terformat.
//
// AKSES: grup Telegram (TELEGRAM_GROUP_CHAT_ID di env var) dapat akses FULL ke semua
// menu data TERMASUK "👑 Owner Panel" — semua anggota grup diperlakukan sebagai owner.
// Owner personal (TELEGRAM_CHAT_ID, kalau masih diisi) + siapapun di tabel bot_users
// tetap diizinkan juga untuk kompatibilitas mundur.
// Chat ID yang TIDAK ada di salah satu dari itu akan diam-diam di-ignore.
//
// Setup sekali: daftarkan URL endpoint ini ke Telegram lewat setWebhook (lihat api/setup-webhook.js).

const { getSupabase } = require('./_supabase');
const { getStatus, isGhost, mergeRows, fmtRp } = require('./_creator-logic');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.TELEGRAM_CHAT_ID; // opsional, kompatibilitas mundur
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const SITE_URL = process.env.SITE_URL; // contoh: https://affiliate-skinku.vercel.app — dipakai buat tombol "🌐 Buka Dashboard"
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ---------- Helper kirim pesan/edit pesan ke Telegram ----------
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

// ---------- Keyboard ----------
function buildMenuKeyboard(isOwner) {
  const rows = [
    [{ text: '📊 Ringkasan Hari Ini', callback_data: 'summary' }],
    [{ text: '🔥 Top Perform', callback_data: 'perform' }, { text: '👻 Ghost Kreator', callback_data: 'ghost' }],
    [{ text: '🔵 Rekomendasi Sampel', callback_data: 'rekomen' }, { text: '⏰ Kontrak Expire', callback_data: 'expiring' }]
  ];
  if (SITE_URL) rows.push([{ text: '🌐 Buka Dashboard', url: SITE_URL }]);
  rows.push([{ text: '🔄 Refresh', callback_data: 'menu' }]);
  if (isOwner) rows.push([{ text: '👑 Owner Panel', callback_data: 'owner_panel' }]);
  return rows;
}
const BACK_KEYBOARD = SITE_URL
  ? [[{ text: '🌐 Buka Dashboard', url: SITE_URL }], [{ text: '« Menu Utama', callback_data: 'menu' }]]
  : [[{ text: '« Menu Utama', callback_data: 'menu' }]];
const OWNER_PANEL_KEYBOARD = [
  [{ text: '👥 Lihat Daftar User', callback_data: 'owner_list' }],
  [{ text: '« Menu Utama', callback_data: 'menu' }]
];

// ---------- Akses & whitelist (tabel bot_users di Supabase) ----------
async function getBotUsers() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('bot_users').select('*').order('added_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

async function isAuthorized(chatId) {
  if (String(chatId) === String(OWNER_CHAT_ID)) return true;
  if (GROUP_CHAT_ID && String(chatId) === String(GROUP_CHAT_ID)) return true;
  try {
    const users = await getBotUsers();
    return users.some(u => String(u.chat_id) === String(chatId));
  } catch (err) {
    console.error('Gagal cek whitelist bot_users:', err);
    return false; // fail-closed: kalau Supabase error, lebih aman nolak daripada nge-bug jadi terbuka
  }
}

async function addBotUser(chatId, displayName) {
  const supabase = getSupabase();
  const { error } = await supabase.from('bot_users').insert({ chat_id: String(chatId), display_name: displayName || '' });
  if (error) throw new Error(error.message);
}

async function removeBotUser(chatId) {
  const supabase = getSupabase();
  const { error } = await supabase.from('bot_users').delete().eq('chat_id', String(chatId));
  if (error) throw new Error(error.message);
}

// ---------- Ambil & siapkan data dari Supabase (sama seperti loadAllDataFromServer di frontend) ----------
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

// ---------- Builder tiap menu ----------
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

async function buildMenu(ctx) {
  const greet = ctx.isOwner ? '👑 Halo owner!' : '🤖 Halo!';
  return { text: `${greet}\n\n*Affiliate Analyzer Bot*\n\nMau lihat apa?`, keyboard: buildMenuKeyboard(ctx.isOwner) };
}

async function buildOwnerPanel(ctx) {
  if (!ctx.isOwner) return { text: '🚫 Menu ini cuma buat owner.', keyboard: BACK_KEYBOARD };
  return {
    text: `👑 *Owner Panel*\n\n` +
      `Kelola siapa aja yang boleh pakai bot ini.\n\n` +
      `Buat *nambah* orang baru, kirim pesan format:\n` +
      `\`/adduser <chat_id> <nama>\`\n` +
      `Contoh: \`/adduser 123456789 Budi\`\n\n` +
      `Buat *hapus* orang, kirim pesan format:\n` +
      `\`/removeuser <chat_id>\`\n\n` +
      `Chat ID bisa didapat lewat @userinfobot di Telegram.`,
    keyboard: OWNER_PANEL_KEYBOARD
  };
}

async function buildOwnerList(ctx) {
  if (!ctx.isOwner) return { text: '🚫 Menu ini cuma buat owner.', keyboard: BACK_KEYBOARD };
  const users = await getBotUsers();
  const ownerLine = OWNER_CHAT_ID
    ? `👑 \`${OWNER_CHAT_ID}\` — Owner personal`
    : null;
  const groupLine = GROUP_CHAT_ID ? `👥 \`${GROUP_CHAT_ID}\` — Grup (semua anggota = owner)` : null;
  const headerLines = [ownerLine, groupLine].filter(Boolean).join('\n');
  if (!users.length) return { text: `👥 *Daftar User Bot*\n\n${headerLines}\n\n_Belum ada user tambahan di whitelist._`, keyboard: OWNER_PANEL_KEYBOARD };
  const lines = users.map(u => `• \`${u.chat_id}\`${u.display_name ? ' — ' + u.display_name : ''}`);
  return { text: `👥 *Daftar User Bot* (${users.length + 1})\n\n${headerLines}\n${lines.join('\n')}`, keyboard: OWNER_PANEL_KEYBOARD };
}

const ROUTES = {
  menu: buildMenu, summary: buildSummary, perform: buildPerform, ghost: buildGhost,
  rekomen: buildRekomen, expiring: buildExpiring,
  owner_panel: buildOwnerPanel, owner_list: buildOwnerList
};

// ---------- Command teks (/adduser, /removeuser) — cuma owner ----------
async function handleOwnerCommand(text, ctx) {
  if (!ctx.isOwner) return null;

  const addMatch = text.match(/^\/adduser\s+(-?\d+)\s*(.*)$/i);
  if (addMatch) {
    const [, chatId, name] = addMatch;
    try {
      await addBotUser(chatId, name.trim());
      return { text: `✅ Chat ID \`${chatId}\`${name ? ' (' + name.trim() + ')' : ''} berhasil ditambahkan ke whitelist.`, keyboard: OWNER_PANEL_KEYBOARD };
    } catch (err) {
      return { text: `⚠️ Gagal nambah user: ${err.message}`, keyboard: OWNER_PANEL_KEYBOARD };
    }
  }

  const removeMatch = text.match(/^\/removeuser\s+(-?\d+)$/i);
  if (removeMatch) {
    const [, chatId] = removeMatch;
    try {
      await removeBotUser(chatId);
      return { text: `✅ Chat ID \`${chatId}\` berhasil dihapus dari whitelist.`, keyboard: OWNER_PANEL_KEYBOARD };
    } catch (err) {
      return { text: `⚠️ Gagal hapus user: ${err.message}`, keyboard: OWNER_PANEL_KEYBOARD };
    }
  }

  return null; // bukan command owner, lanjut ke flow biasa
}

// ---------- Handler utama ----------
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true }); // Telegram cuma POST, GET buat cek hidup aja

  if (!BOT_TOKEN || (!OWNER_CHAT_ID && !GROUP_CHAT_ID)) {
    console.error('TELEGRAM_BOT_TOKEN belum diset, atau TELEGRAM_CHAT_ID/TELEGRAM_GROUP_CHAT_ID keduanya kosong');
    return res.status(200).json({ ok: true }); // tetap 200 ke Telegram supaya tidak retry terus
  }

  try {
    const update = req.body || {};
    const incomingChatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    if (!incomingChatId) return res.status(200).json({ ok: true });

    const authorized = await isAuthorized(incomingChatId);
    if (!authorized) {
      return res.status(200).json({ ok: true }); // diam-diam ignore, jangan kasih tahu apapun ke pengirim asing
    }
    const ctx = { isOwner: String(incomingChatId) === String(OWNER_CHAT_ID) || (GROUP_CHAT_ID && String(incomingChatId) === String(GROUP_CHAT_ID)) };

    // ---------- Klik inline button ----------
    if (update.callback_query) {
      const cq = update.callback_query;
      const action = cq.data;
      const builder = ROUTES[action] || ROUTES.menu;
      answerCallback(cq.id).catch(() => {}); // ack cepat biar tombol tidak "loading" lama di UI Telegram
      try {
        const { text, keyboard } = await builder(ctx);
        await editMessage(cq.message.chat.id, cq.message.message_id, text, keyboard);
      } catch (err) {
        await editMessage(cq.message.chat.id, cq.message.message_id, `⚠️ Gagal ambil data: ${err.message}`, BACK_KEYBOARD);
      }
      return res.status(200).json({ ok: true });
    }

    // ---------- Pesan teks ----------
    if (update.message) {
      const text = (update.message.text || '').trim();

      // Command khusus owner buat kelola whitelist
      if (ctx.isOwner && /^\/(adduser|removeuser)\b/i.test(text)) {
        const result = await handleOwnerCommand(text, ctx);
        if (result) {
          await sendMessage(update.message.chat.id, result.text, result.keyboard);
          return res.status(200).json({ ok: true });
        }
      }

      // Default: pesan apapun (termasuk /start) → tampilkan menu
      const { text: menuText, keyboard } = await buildMenu(ctx);
      await sendMessage(update.message.chat.id, menuText, keyboard);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ ok: true }); // selalu 200 ke Telegram, error di-log aja di Vercel
  }
};
