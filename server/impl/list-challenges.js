const { getSupabase, requireAuth, setCors } = require('./_supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method !== 'GET') return res.status(200).json({ ok: true });
  const auth = requireAuth(req, res);
  if (!auth) return; // requireAuth responded
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ ok: true, challenges: data || [] });
  } catch (err) {
    console.error('list-challenges error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
