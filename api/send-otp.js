// api/send-otp.js
// Stateless OTP: enkripsi OTP di signed token, kirim ke client
// Tidak butuh database atau global memory (kecuali rate-limit counter di Supabase)

const crypto = require('crypto');
const { checkRateLimit, getClientIp } = require('./_rate-limit');

function signToken(otp, secret) {
  const expires = Date.now() + 5 * 60 * 1000;
  const payload = `${otp}:${expires}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID   = process.env.TELEGRAM_GROUP_CHAT_ID;
  const SECRET    = process.env.OTP_SECRET;

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN atau TELEGRAM_GROUP_CHAT_ID belum diset di Vercel. TELEGRAM_GROUP_CHAT_ID harus diisi Chat ID grup (biasanya diawali angka negatif, mis. -1001234567890), bukan Chat ID personal.' });
  }
  if (!SECRET) {
    // Sengaja TIDAK ada fallback default — secret hardcode di kode adalah lubang keamanan.
    return res.status(500).json({ error: 'OTP_SECRET belum diset di Environment Variables Vercel. Tambahkan dulu (string random apapun, minimal 32 karakter), lalu Redeploy.' });
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
    // Kirim signed token ke client — OTP ter-enkripsi di dalamnya
    return res.status(200).json({ success: true, token });
  } catch (err) {
    return res.status(500).json({ error: 'Gagal kirim OTP: ' + err.message });
  }
};
