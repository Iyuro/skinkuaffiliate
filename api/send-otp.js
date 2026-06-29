// api/send-otp.js
// Stateless OTP: enkripsi OTP di signed token, kirim ke client
// Tidak butuh database atau global memory

const crypto = require('crypto');

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
  const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;
  const SECRET    = process.env.OTP_SECRET || 'skinku-affiliate-default-secret-2025';

  if (!BOT_TOKEN || !CHAT_ID) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum diset di Vercel' });
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
