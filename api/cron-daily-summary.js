// api/cron-daily-summary.js
// Dipanggil otomatis oleh Vercel Cron, 2 jadwal berbeda yang keduanya nembak
// endpoint yang SAMA (lihat vercel.json) — sengaja digabung 1 file (bukan file
// terpisah) supaya nggak nambah kuota Serverless Function di Vercel Hobby plan:
//   1. Tiap jam 9 pagi WIB (02:00 UTC), semua hari → ?type=summary (default)
//      Kirim ringkasan + alert (ghost kreator, kontrak expire) ke grup Telegram.
//   2. Tiap jam 6 sore WIB (11:00 UTC), Senin-Sabtu → ?type=reminder
//      Reminder upload Sample Analysis & Transaction Analysis kalau hari itu
//      belum ada yang keupload.
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

// "Hari ini" dihitung pakai WIB (UTC+7), bukan UTC — soalnya cron-nya jalan
// jam 18:00 WIB yang berarti masih 11:00 UTC, kalau salah pakai UTC bisa keliru
// mikir "hari ini" itu masih hari kemarin pas dicek ke database.
function todayRangeWib() {
  const nowWib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const dateStr = nowWib.toISOString().slice(0, 10); // YYYY-MM-DD dalam WIB
  return `${dateStr}T00:00:00+07:00`;
}

async function buildUploadReminderText() {
  const supabase = getSupabase();
  const startOfDayWib = todayRangeWib();

  const { data: files, error } = await supabase
    .from('uploaded_files')
    .select('file_type, uploaded_at')
    .gte('uploaded_at', startOfDayWib);
  if (error) throw new Error(error.message);

  const hasSample = (files || []).some(f => f.file_type === 'sample');
  const hasTransaction = (files || []).some(f => f.file_type === 'transaction');

  if (hasSample && hasTransaction) {
    return {
      text: `✅ *Data Hari Ini Udah Lengkap*\n\nSample Analysis & Transaction Analysis udah keupload hari ini. Mantap, makasih udah rajin update! 🙌`,
      showButton: false
    };
  }

  const missing = [];
  if (!hasSample) missing.push('📤 *Sample Analysis Creator List*');
  if (!hasTransaction) missing.push('📤 *Transaction Analysis Creator List*');

  const text =
    `⏰ *Reminder Upload Data Hari Ini*\n\n` +
    `Udah jam 6 sore nih! Yang masih belum keupload hari ini:\n\n` +
    `${missing.join('\n')}\n\n` +
    `Yuk sempetin upload dulu ke dashboard biar ranking & podium selalu update ya 🙏`;

  return { text, showButton: true };
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
    const type = req.query && req.query.type === 'reminder' ? 'reminder' : 'summary';

    if (type === 'reminder') {
      const { text, showButton } = await buildUploadReminderText();
      // Derive domain dashboard dari header request, biar link-nya otomatis
      // ikut domain Vercel yang lagi aktif tanpa perlu di-hardcode manual.
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const keyboard = (showButton && host) ? [[{ text: '📂 Buka Dashboard', url: `https://${host}` }]] : undefined;
      await sendMessage(GROUP_CHAT_ID, text, keyboard);
      return res.status(200).json({ success: true, type: 'reminder' });
    }

    const result = await buildDailyText();
    if (!result) return res.status(200).json({ skipped: true, reason: 'Belum ada data' });

    const keyboard = result.ghostCount
      ? [[{ text: '📲 Follow Up ke Grup WA', callback_data: 'followup_wa' }]]
      : undefined;

    await sendMessage(GROUP_CHAT_ID, result.text, keyboard);

    return res.status(200).json({ success: true, type: 'summary', sentTo: 1 });
  } catch (err) {
    console.error('Cron daily summary error:', err);
    return res.status(500).json({ error: err.message });
  }
};
