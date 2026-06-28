// server/impl/_supabase.js (moved from api/_supabase.js)
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

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

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
