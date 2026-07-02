// api/verify-otp.js
// Verifikasi OTP dari signed token — fully stateless (token-nya), TAPI rate-limited
// per-IP lewat Supabase supaya brute-force 6-digit OTP tidak praktis dilakukan.

const crypto = require('crypto');
const { checkRateLimit, getClientIp } = require('./_rate-limit');
const { logActivity } = require('./_activity-log');

function verifyToken(token, otp, secret) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) return { ok: false, reason: 'Token tidak valid' };
    const [storedOtp, expires, sig] = parts;
    if (Date.now() > parseInt(expires)) return { ok: false, reason: 'OTP sudah expired. Minta OTP baru.' };
    const payload = `${storedOtp}:${expires}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    // Bandingkan signature dengan timing-safe compare, bukan !== biasa,
    // supaya tidak bisa diserang lewat timing attack pada perbandingan string.
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return { ok: false, reason: 'Token tidak valid' };
    }
    if (storedOtp !== otp.trim()) return { ok: false, reason: 'OTP salah. Coba lagi.' };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: 'Token tidak valid' };
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SECRET = process.env.OTP_SECRET;
  if (!SECRET) {
    // Sengaja TIDAK ada fallback default di sini — secret hardcode di kode adalah
    // lubang keamanan (siapapun yang punya kode ini akan tahu secretnya juga).
    return res.status(500).json({ error: 'OTP_SECRET belum diset di Environment Variables Vercel. Tambahkan dulu (string random apapun, minimal 32 karakter), lalu Redeploy.' });
  }

  // Rate limit: maksimal 5 percobaan verifikasi per 10 menit per-IP.
  // Brute-force 6-digit OTP (1 juta kombinasi) jadi tidak praktis dengan limit ini.
  const ip = getClientIp(req);
  const rl = await checkRateLimit('otp_verify', ip, { maxAttempts: 5, windowMs: 10 * 60 * 1000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: `Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfterSec} detik.` });
  }

  const { token, otp } = req.body || {};
  if (!token || !otp) return res.status(400).json({ error: 'token dan otp wajib diisi' });

  const result = verifyToken(token, otp, SECRET);
  if (!result.ok) {
    await logActivity(req, 'login_failed', result.reason);
    return res.status(401).json({ error: result.reason });
  }

  const authToken = Buffer.from(JSON.stringify({ auth: true, ts: Date.now() })).toString('base64');
  await logActivity(req, 'login_success', null);
  return res.status(200).json({ success: true, token: authToken });
};
