const { getSupabase, requireAuth, setCors } = require('./_supabase');

module.exports = async function handler(req, res){
  setCors(res);
  if (req.method !== 'GET') return res.status(200).json({ ok: true });
  const auth = requireAuth(req, res);
  if(!auth) return;
  try{
    const id = req.query && (req.query.id || req.url.split('?id=')[1]) || null;
    if(!id) return res.status(400).json({ ok:false, error:'id missing' });
    const supabase = getSupabase();
    const { data, error } = await supabase.from('challenge_submissions').select('*').eq('challenge_id', id).order('created_at',{ascending:false});
    if(error) throw error;
    return res.status(200).json({ ok:true, submissions: data||[] });
  }catch(err){ console.error('list-submissions',err); return res.status(500).json({ ok:false, error: err.message }); }
};
