// api/activity-log.js
// GET daftar histori aktivitas (buat panel "🕵️ Activity Log" di halaman Settings).
// Opsional ?action=upload_file buat filter per jenis aksi, ?limit=100 (maks 300).

const { getSupabase, setCors, requireAuth } = require('./_supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!requireAuth(req, res)) return;

  try {
    const supabase = getSupabase();
    const limit = Math.min(parseInt(req.query?.limit, 10) || 100, 300);

    let query = supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit);
    if (req.query?.action) query = query.eq('action', String(req.query.action).slice(0, 50));

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ logs: data || [] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
