// api/_activity-log.js
// Helper buat nyatet histori aktivitas ke tabel `activity_log` di Supabase.
// Identitas "siapa"-nya dibaca OTOMATIS dari IP + User-Agent request (bukan
// nama akun), karena sistem ini masih pakai 1 kode OTP bareng buat semua
// orang yang login — belum ada akun/identitas per-orang.

const { getSupabase } = require('./_supabase');
const { getClientIp } = require('./_rate-limit');

function parseDevice(uaRaw) {
  const ua = String(uaRaw || '');

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac os|macintosh/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod|ios/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera';
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari';

  const deviceType = /ipad|tablet/i.test(ua)
    ? 'Tablet'
    : /mobile|android|iphone/i.test(ua) ? 'Mobile' : 'Desktop';

  return { os, browser, deviceType };
}

// Nggak pernah dibiarkan "throw" ke pemanggilnya — gagal nyatet log jangan
// sampai bikin aksi utamanya (upload/hapus/login/dll) ikut gagal.
async function logActivity(req, action, detail) {
  try {
    const supabase = getSupabase();
    const ip = getClientIp(req);
    const { os, browser, deviceType } = parseDevice(req.headers['user-agent']);
    await supabase.from('activity_log').insert({
      action: String(action || 'unknown').slice(0, 50),
      detail: detail ? String(detail).slice(0, 500) : null,
      ip,
      os,
      browser,
      device_type: deviceType,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 300)
    });
  } catch (err) {
    console.error('Gagal catat activity log:', err.message);
  }
}

module.exports = { logActivity, parseDevice };
