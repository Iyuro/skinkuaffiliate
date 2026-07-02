// api/cron-daily-summary.js
// Dipanggil otomatis oleh Vercel Cron tiap jam 9 pagi WIB (02:00 UTC) — lihat
// schedule di vercel.json. Kirim ringkasan + alert (ghost kreator, kontrak expire)
// ke GRUP Telegram (TELEGRAM_GROUP_CHAT_ID di env var).
//
// Vercel Cron memanggil endpoint ini dengan header Authorization: Bearer <CRON_SECRET>
// (otomatis ditambahkan Vercel kalau env var CRON_SECRET diset) — ini mencegah orang
// luar memicu notifikasi massal cuma dengan nebak URL endpoint ini.

const { getSupabase } = require('./_supabase');
const { getStatus, isGhost, mergeRows, fmtRp } = require('./_creator-logic');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const CRON_SECRET = process.env.CRON_SECRET;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

function sendMessage(chatId, text, keyboard) {
  return fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
    })
  }).then(r => r.json());
}

async function buildDailyText() {
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

  if (!allData.length) return null; // belum ada data sama sekali, skip kirim notif kosong

  const tGmv = allData.reduce((a, r) => a + r.gmv, 0);
  const tVideo = allData.reduce((a, r) => a + r.videoSampel, 0);
  const tSampel = allData.reduce((a, r) => a + r.sampelTerkirim, 0);
  const ghosts = allData.filter(isGhost);
  const performCount = allData.filter(r => getStatus(r) === 'perform').length;
  const boncosCount = allData.filter(r => getStatus(r) === 'boncos').length;

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiring = (exclusive || []).filter(e => e.expire && new Date(e.expire) >= now && new Date(e.expire) <= in7d);
  const expired = (exclusive || []).filter(e => e.expire && new Date(e.expire) < now);

  let text = `☀️ *Ringkasan Pagi Ini*\n\n` +
    `👥 Total Kreator: *${allData.length}*\n` +
    `💰 Total GMV: *${fmtRp(tGmv)}*\n` +
    `📦 Sampel Terkirim: *${tSampel}* pcs\n` +
    `🎬 Video Diposting: *${tVideo}*\n\n` +
    `🔥 Perform: *${performCount}*  ❌ Boncos: *${boncosCount}*  👻 Ghost: *${ghosts.length}*`;

  if (ghosts.length) {
    const lines = ghosts.slice(0, 5).map(r => `• [@${r.name}](https://www.tiktok.com/@${r.name})`);
    text += `\n\n👻 *Ghost Kreator yang Perlu Dicek:*\n${lines.join('\n')}`;
    if (ghosts.length > 5) text += `\n_+${ghosts.length - 5} lainnya — cek bot buat detail lengkap_`;
  }

  if (expired.length || expiring.length) {
    text += `\n\n⏰ *Kontrak/VIP:*`;
    if (expired.length) text += `\n🔴 ${expired.length} sudah expired`;
    if (expiring.length) text += `\n🟡 ${expiring.length} mau expire ≤7 hari`;
  }

  return { text, ghostCount: ghosts.length };
}

module.exports = async function handler(req, res) {
  // Keamanan: Vercel Cron otomatis kirim header ini kalau CRON_SECRET diset di env var.
  // Kalau request datang tanpa secret yang cocok, tolak (mencegah orang luar trigger broadcast).
  if (CRON_SECRET) {
    const authHeader = req.headers['authorization'] || '';
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  if (!BOT_TOKEN || !GROUP_CHAT_ID) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN/TELEGRAM_GROUP_CHAT_ID belum diset' });
  }

  try {
    const result = await buildDailyText();
    if (!result) return res.status(200).json({ skipped: true, reason: 'Belum ada data' });

    const keyboard = result.ghostCount
      ? [[{ text: '📲 Follow Up ke Grup WA', callback_data: 'followup_wa' }]]
      : undefined;

    await sendMessage(GROUP_CHAT_ID, result.text, keyboard);

    return res.status(200).json({ success: true, sentTo: 1 });
  } catch (err) {
    console.error('Cron daily summary error:', err);
    return res.status(500).json({ error: err.message });
  }
};
