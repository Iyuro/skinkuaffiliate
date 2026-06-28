const { getSupabase, setCors } = require('./_supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method !== 'POST') return res.status(200).json({ ok: true });
  try {
    const body = req.body || {};
    const supabase = getSupabase();
    const row = {
      challenge_id: body.challenge_id,
      username: body.username || null,
      tiktok_link: body.tiktok_link || null,
      phone: body.phone || null,
      email: body.email || null,
      extra: body.extra || null,
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from('challenge_submissions').insert([row]);
    if (error) throw error;

    try{
      const { data: cdata } = await supabase.from('challenges').select('webhook_url,google_form_url').eq('id', body.challenge_id).limit(1).single();
      const webhook = cdata && cdata.webhook_url;
      const gform = cdata && cdata.google_form_url;
      if (webhook) {
        try{ await fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(row) }); }catch(e){}
      }
      return res.status(200).json({ ok: true, redirect: gform || null });
    }catch(e){
      return res.status(200).json({ ok: true });
    }
  } catch (err) {
    console.error('submit-challenge error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
};
