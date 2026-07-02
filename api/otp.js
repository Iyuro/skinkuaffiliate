// api/otp.js
// Gabungan dari bekas api/send-otp.js + api/verify-otp.js jadi 1 file.
// Alasannya BUKAN soal kerapian kode, tapi supaya jumlah Serverless Function
// nggak kena limit 12 punya Vercel Hobby plan (tiap file .js di /api dihitung
// 1 function tersendiri). Body request butuh field "action": "send" atau "verify".
//
// Stateless OTP: enkripsi OTP di signed token, kirim ke client.
// Tidak butuh database atau global memory (kecuali rate-limit counter di Supabase).

const crypto = require('crypto');
const { checkRateLimit, getClientIp } = require('./_rate-limit');
const { logActivity } = require('./_activity-log');

function signToken(otp, secret) {
  const expires = Date.now() + 5 * 60 * 1000;
  const payload = `${otp}:${expires}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

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

async function handleSend(req, res, SECRET) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_GROUP_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN atau TELEGRAM_GROUP_CHAT_ID belum diset di Vercel. TELEGRAM_GROUP_CHAT_ID harus diisi Chat ID grup (biasanya diawali angka negatif, mis. -1001234567890), bukan Chat ID personal.' });
  }

  // Rate limit: maksimal 3 kali kirim OTP per 5 menit per-IP, supaya tidak ada yang
  // bisa spam kirim OTP berkali-kali (yang juga berarti spam pesan Telegram ke owner).
  const ip = getClientIp(req);
  const rl = await checkRateLimit('otp_send', ip, { maxAttempts: 3, windowMs: 5 * 60 * 1000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: `Terlalu banyak permintaan OTP. Coba lagi dalam ${rl.retryAfterSec} detik.` });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const token = signToken(otp, SECRET);
  const text = `🔐 *Affiliate Analyzer — OTP Login*\n\nKode OTP lo:\n\`${otp}\`\n\n⏱ Berlaku 5 menit\n⚠️ Jangan kasih ke siapapun`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'Markdown' })
    });
    const tgData = await tgRes.json();
    if (!tgData.ok) throw new Error(tgData.description || 'Telegram error');
    await logActivity(req, 'otp_requested', null);
    // Kirim signed token ke client — OTP ter-enkripsi di dalamnya
    return res.status(200).json({ success: true, token });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal kirim OTP: ' + err.message });
  }
}

async function handleVerify(req, res, SECRET) {
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

  const action = (req.body && req.body.action) || '';
  if (action === 'send') return handleSend(req, res, SECRET);
  if (action === 'verify') return handleVerify(req, res, SECRET);
  return res.status(400).json({ error: 'Field "action" wajib diisi: "send" atau "verify"' });
};
