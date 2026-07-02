// api/log-activity.js
// Endpoint buat aksi yang murni terjadi di browser dan nggak pernah nyentuh
// server lewat endpoint lain — misalnya pindah tab/halaman, logout, atau klik
// "Reset" (sync ulang). Aksi yang MEMANG udah lewat server (upload file, hapus
// file, ubah data Exclusive, login) dicatat langsung di endpoint masing-masing
// (lihat api/files.js, api/exclusive.js, api/verify-otp.js) — nggak lewat sini.

const { setCors, requireAuth } = require('./_supabase');
const { logActivity } = require('./_activity-log');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  const { action, detail } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action wajib diisi' });

  await logActivity(req, action, detail);
  return res.status(200).json({ success: true });
};
