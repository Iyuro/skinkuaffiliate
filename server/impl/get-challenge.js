const { getSupabase, setCors } = require('./_supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method !== 'GET') return res.status(200).json({ ok: true });
  try {
    const id = req.query && (req.query.id || req.url.split('?id=')[1]) || null;
    if (!id) return res.status(400).json({ ok: false, error: 'id missing' });
    const supabase = getSupabase();
    const { data, error } = await supabase.from('challenges').select('*').eq('id', id).limit(1).single();
    if (error) return res.status(404).json({ ok: false, error: error.message });
    return res.status(200).json({ ok: true, challenge: data });
  } catch (err) {
    console.error('get-challenge error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
