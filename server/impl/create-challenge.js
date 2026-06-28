const { getSupabase, requireAuth, setCors } = require('./_supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method !== 'POST') return res.status(200).json({ ok: true });
  const auth = requireAuth(req, res);
  if (!auth) return; // requireAuth already responded
  try {
    const body = req.body || {};
    const supabase = getSupabase();
    const id = 'ch_' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
    const row = {
      id,
      title: body.title || 'Untitled Challenge',
      description: body.description || '',
      reward: body.reward || '',
      google_form_url: body.google_form_url || null,
      webhook_url: body.webhook_url || null,
      start_at: body.start_at || null,
      end_at: body.end_at || null,
      owner: auth && auth.user ? auth.user : null,
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from('challenges').insert([row]);
    if (error) throw error;
    return res.status(200).json({ ok: true, challenge: row });
  } catch (err) {
    console.error('create-challenge error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
