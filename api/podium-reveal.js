// api/podium-reveal.js
// Endpoint PUBLIK buat fitur "🔓 Intip" di /podium.html.
// Kreator bisa buktikan itu akun dia dengan ngetik username LENGKAPNYA sendiri
// (dipakai sebagai "kata sandi"). Kalau cocok, server balikin username asli
// (belum disensor) + pesan selamat. Kalau salah, tidak dikasih tau username-nya
// (jadi tidak bisa dipakai buat nebak-nebak/brute-force username orang lain).
//
// Sengaja dibikin endpoint terpisah dari api/podium.js (yang selalu sensor username)
// supaya payload publik /api/podium tetap aman walau endpoint ini ada.

const { getSupabase, setCors } = require('./_supabase');
const { mergeRows, fmtRp } = require('./_creator-logic');
const { checkRateLimit, getClientIp } = require('./_rate-limit');
const { extractPeriod } = require('./_period-utils');

function normalize(name) {
  return String(name || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase();
}

const CONGRATS_MESSAGES = [
  'Yeay, kamu berhasil buka identitasmu sendiri! Selamat ya, sukses terus kontennya! 🎉',
  'Cocok! Selamat, kamu memang pemiliknya. Semangat terus bikin konten yaa! ✨',
  'Password benar! Selamat atas pencapaianmu di rank ini, keep growing! 🚀',
  'Terverifikasi! Selamat, semoga makin cuan dan makin banyak video ya! 💖'
];

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ip = getClientIp(req);
    const rl = await checkRateLimit('podium_reveal', ip, { maxAttempts: 12, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) {
      return res.status(429).json({
        success: false,
        rateLimited: true,
        message: `Kebanyakan percobaan. Coba lagi dalam ${Math.ceil(rl.retryAfterSec / 60)} menit ya.`
      });
    }

    const body = req.body || {};
    const type = body.type === 'video' ? 'video' : 'gmv';
    const rank = parseInt(body.rank, 10);
    const guess = normalize(body.guess);
    const period = body.period ? String(body.period).trim() : '';
    const filterByPeriod = period && period !== 'all';

    if (!rank || rank < 1) return res.status(400).json({ success: false, message: 'Rank tidak valid.' });
    if (!guess) return res.status(400).json({ success: false, message: 'Username belum diisi.' });

    const supabase = getSupabase();

    let fileIds = null;
    if (filterByPeriod) {
      const { data: files, error: fErr } = await supabase.from('uploaded_files').select('id, file_name');
      if (fErr) return res.status(500).json({ success: false, message: 'Gagal ambil data periode.' });
      fileIds = (files || []).filter(f => extractPeriod(f.file_name) === period).map(f => f.id);
      if (!fileIds.length) return res.status(404).json({ success: false, message: 'Data untuk periode ini tidak ditemukan.' });
    }

    let rowsQuery = supabase.from('creator_rows').select('*');
    if (fileIds) rowsQuery = rowsQuery.in('file_id', fileIds);
    const { data: rawRows, error } = await rowsQuery;
    if (error) return res.status(500).json({ success: false, message: 'Gagal ambil data.' });

    const appRows = (rawRows || []).map(r => ({
      name: r.name, sampelDiminta: r.sampel_diminta || 0, sampelTerkirim: r.sampel_terkirim || 0,
      videoSampel: r.video_sampel || 0, liveSampel: r.live_sampel || 0, gmv: r.gmv || 0,
      roi45: r.roi45 || 0, roi90: r.roi90 || 0, orders: r.orders || 0, src: r.src || 'sample'
    }));
    const allData = mergeRows(appRows);

    const sorted = type === 'video'
      ? [...allData].sort((a, b) => b.videoSampel - a.videoSampel)
      : [...allData].sort((a, b) => b.gmv - a.gmv);

    const target = sorted[rank - 1];
    if (!target) return res.status(404).json({ success: false, message: 'Data untuk rank ini tidak ditemukan.' });

    const isMatch = normalize(target.name) === guess;
    if (!isMatch) {
      return res.status(200).json({ success: false, message: 'Password salah nih, bukan username yang tepat. Coba lagi ya! 🔒' });
    }

    const msg = CONGRATS_MESSAGES[Math.floor(Math.random() * CONGRATS_MESSAGES.length)];
    return res.status(200).json({
      success: true,
      username: target.name,
      gmv: target.gmv,
      gmvFormatted: fmtRp(target.gmv),
      video: target.videoSampel,
      message: msg
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
