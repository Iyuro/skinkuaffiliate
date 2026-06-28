const { getSupabase } = require('./_supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { token, otp } = req.body || {};
  if (!token || !otp) {
    return res.status(400).json({ ok: false, error: 'Token atau OTP tidak boleh kosong' });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.from('telegram_login_otps').select('*').eq('code', otp).eq('used', false).limit(1);
  if (error) {
    console.error('verify-otp supabase error', error);
    return res.status(500).json({ ok: false, error: 'Gagal validasi OTP' });
  }

  const record = data && data[0];
  if (!record) {
    return res.status(401).json({ ok: false, error: 'OTP tidak valid atau sudah dipakai' });
  }

  if (new Date(record.expires_at) < new Date()) {
    return res.status(401).json({ ok: false, error: 'OTP sudah kadaluarsa' });
  }

  const { error: updateError } = await supabase.from('telegram_login_otps').update({ used: true }).eq('id', record.id);
  if (updateError) {
    console.error('verify-otp update error', updateError);
    return res.status(500).json({ ok: false, error: 'Gagal update OTP' });
  }

  const authToken = Buffer.from(JSON.stringify({ auth: true, issued_at: new Date().toISOString() })).toString('base64');
  return res.status(200).json({ ok: true, token: authToken });
};