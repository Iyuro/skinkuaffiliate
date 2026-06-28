const { getSupabase, requireAuth, setCors } = require('./_supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method !== 'POST') return res.status(200).json({ ok: true });
  const auth = requireAuth(req, res);
  if (!auth) return;
  try{
    const { challenge_id, submission_id } = req.body || {};
    if(!challenge_id || !submission_id) return res.status(400).json({ ok: false, error: 'missing params' });
    const supabase = getSupabase();
    const { error: upErr } = await supabase.from('challenges').update({ winner_submission_id: submission_id }).eq('id', challenge_id);
    if(upErr) throw upErr;
    const { data: sub, error: sErr } = await supabase.from('challenge_submissions').select('*').eq('id', submission_id).limit(1).single();
    if(sErr) throw sErr;
    const { data: ch } = await supabase.from('challenges').select('*').eq('id', challenge_id).limit(1).single();
    if(ch && ch.webhook_url){
      try{ await fetch(ch.webhook_url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({event:'winner', submission: sub, challenge: ch}) }); }catch(e){}
    }
    return res.status(200).json({ ok: true });
  }catch(err){
    console.error('pick-winner error', err);
    return res.status(500).json({ ok:false, error: err.message });
  }
};
