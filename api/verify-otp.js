// api/verify-otp.js
// Verifikasi OTP dari signed token — fully stateless

const crypto = require('crypto');

function verifyToken(token, otp, secret) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) return { ok: false, reason: 'Token tidak valid' };
    const [storedOtp, expires, sig] = parts;
    if (Date.now() > parseInt(expires)) return { ok: false, reason: 'OTP sudah expired. Minta OTP baru.' };
    const payload = `${storedOtp}:${expires}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (sig !== expectedSig) return { ok: false, reason: 'Token tidak valid' };
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

  const { token, otp } = req.body || {};
  if (!token || !otp) return res.status(400).json({ error: 'token dan otp wajib diisi' });

  const SECRET = process.env.OTP_SECRET || 'skinku-affiliate-default-secret-2025';
  const result = verifyToken(token, otp, SECRET);

  if (!result.ok) return res.status(401).json({ error: result.reason });

  const authToken = Buffer.from(JSON.stringify({ auth: true, ts: Date.now() })).toString('base64');
  return res.status(200).json({ success: true, token: authToken });
};
