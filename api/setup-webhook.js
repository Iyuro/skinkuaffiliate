// api/setup-webhook.js
// Endpoint bantu sekali-pakai: buka URL ini di browser buat daftarkan webhook bot Telegram.
// Setelah dijalankan SEKALI dan sukses, tidak perlu dipanggil lagi (kecuali domain Vercel berubah).
// Lihat README bagian "BOT TELEGRAM INTERAKTIF" untuk cara pakainya.

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

module.exports = async function handler(req, res) {
  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN belum diset di Vercel' });
  }

  // Deteksi otomatis domain Vercel saat ini dari header request, jadi tidak perlu hardcode.
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const webhookUrl = `${protocol}://${host}/api/telegram-webhook`;

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] })
    });
    const tgData = await tgRes.json();
    if (!tgData.ok) {
      return res.status(500).json({ error: 'Gagal set webhook', detail: tgData.description });
    }
    return res.status(200).json({
      success: true,
      message: `Webhook berhasil didaftarkan ke ${webhookUrl}. Sekarang buka chat bot Telegram lo dan ketik /start.`,
      webhookUrl
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
