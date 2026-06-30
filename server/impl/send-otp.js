const { getSupabase } = require('./_supabase');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const OTP_EXPIRE_MS = 5 * 60 * 1000;

async function tgCall(method, payload) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

function sendMessage(chatId, text) {
  return tgCall('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown'
  });
}

function generateOtp() {
  return Math.floor(Math.random() * 900000 + 100000).toString();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN belum diset' });
  }
  if (!GROUP_CHAT_ID) {
    return res.status(500).json({ ok: false, error: 'TELEGRAM_GROUP_CHAT_ID belum diset. Lihat panduan ambil Chat ID grup di dokumentasi.' });
  }

  const supabase = getSupabase();

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRE_MS).toISOString();

  const { error: insertError } = await supabase.from('telegram_login_otps').insert({
    code,
    expires_at: expiresAt,
    used: false,
    created_at: new Date().toISOString()
  });
  if (insertError) {
    console.error('send-otp insert error', insertError);
    return res.status(500).json({ ok: false, error: 'Gagal simpan OTP' });
  }

  try {
    await sendMessage(GROUP_CHAT_ID, `Kode OTP login Affiliate Analyzer:

*${code}*

Masukkan kode ini di website dalam 5 menit.`);
  } catch (err) {
    console.error('send-otp tg error', GROUP_CHAT_ID, err);
    return res.status(500).json({ ok: false, error: 'Gagal kirim OTP ke grup Telegram' });
  }

  return res.status(200).json({ ok: true, token: Buffer.from(JSON.stringify({ issued_at: new Date().toISOString() })).toString('base64') });
};