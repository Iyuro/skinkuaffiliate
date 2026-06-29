// api/_rate-limit.js
// Rate limiter sederhana berbasis Supabase (serverless function Vercel itu stateless,
// jadi in-memory counter tidak reliable di production — counter harus disimpan di DB).
//
// checkRateLimit('otp_verify', ip, { maxAttempts: 5, windowMs: 10*60*1000 })
// → { allowed: true } kalau masih boleh, atau { allowed: false, retryAfterSec } kalau sudah kena limit.

const { getSupabase } = require('./_supabase');

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

async function checkRateLimit(scope, identifier, opts) {
  const maxAttempts = opts?.maxAttempts ?? 5;
  const windowMs = opts?.windowMs ?? 10 * 60 * 1000; // default 10 menit
  const key = `${scope}:${identifier}`;

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    // Kalau Supabase belum dikonfigurasi, jangan blokir login total karena rate-limit —
    // cukup lewatkan saja (fail-open untuk rate limit, BUKAN untuk auth itu sendiri).
    console.error('Rate limit check gagal (Supabase belum siap), melewati rate limit:', err.message);
    return { allowed: true };
  }

  try {
    const { data: rows } = await supabase.from('rate_limits').select('*').eq('key', key);
    const row = rows && rows[0];
    const now = Date.now();

    if (!row) {
      await supabase.from('rate_limits').insert({ key, attempt_count: 1, window_start: new Date(now).toISOString() });
      return { allowed: true };
    }

    const windowStart = new Date(row.window_start).getTime();
    const windowExpired = now - windowStart > windowMs;

    if (windowExpired) {
      // Window lama sudah lewat, reset hitungan buat key ini.
      await supabase.from('rate_limits').update({ attempt_count: 1, window_start: new Date(now).toISOString() }).eq('key', key);
      return { allowed: true };
    }

    if (row.attempt_count >= maxAttempts) {
      const retryAfterSec = Math.ceil((windowStart + windowMs - now) / 1000);
      return { allowed: false, retryAfterSec };
    }

    await supabase.from('rate_limits').update({ attempt_count: row.attempt_count + 1 }).eq('key', key);
    return { allowed: true };
  } catch (err) {
    console.error('Rate limit check error, melewati rate limit:', err.message);
    return { allowed: true }; // fail-open: error infrastruktur tidak boleh mengunci semua orang dari login
  }
}

module.exports = { checkRateLimit, getClientIp };
