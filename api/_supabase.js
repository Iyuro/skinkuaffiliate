// api/_supabase.js
// Helper kecil buat bikin Supabase client di server-side (pakai service_role key).
// File ini TIDAK pernah dikirim ke browser — cuma dipakai di dalam serverless function lain.
// Penting: jangan pernah import/expose file ini atau SUPABASE_SERVICE_KEY ke kode frontend.

const { createClient } = require('@supabase/supabase-js');

let cachedClient = null;

function getSupabase() {
  if (cachedClient) return cachedClient;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL atau SUPABASE_SERVICE_KEY belum diset di Environment Variables Vercel');
  }
  cachedClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return cachedClient;
}

// Header CORS standar yang dipakai semua endpoint api/data-*.js
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Cek header Authorization sederhana — samakan dengan token hasil verify-otp.js.
// Ini bukan validasi kriptografis penuh (karena authToken cuma base64 stateless),
// tujuannya cuma supaya endpoint data tidak benar-benar terbuka tanpa header sama sekali.
function requireAuth(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ error: 'Belum login. Header Authorization wajib diisi.' });
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
    if (!decoded || decoded.auth !== true) {
      res.status(401).json({ error: 'Token tidak valid' });
      return null;
    }
    return decoded;
  } catch (e) {
    res.status(401).json({ error: 'Token tidak valid' });
    return null;
  }
}

module.exports = { getSupabase, setCors, requireAuth };
