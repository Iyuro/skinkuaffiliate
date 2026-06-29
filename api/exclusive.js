// api/exclusive.js
// CRUD untuk "kolam" kreator Affiliate Exclusive (VIP/Kontrak).
// GET: list semua, POST: tambah/update (kalau body punya "id" → update, kalau tidak → insert),
// DELETE: hapus 1 via ?id=...

const { getSupabase, setCors, requireAuth } = require('./_supabase');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('exclusive_creators')
      .select('*')
      .order('added_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ items: data || [] });
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.username) return res.status(400).json({ error: 'username wajib diisi' });
    if (String(b.username).length > 100) return res.status(400).json({ error: 'Username terlalu panjang (maks 100 karakter)' });

    const validTipe = ['vip', 'contract', 'both'];
    const validPlatform = ['tiktok', 'instagram', 'youtube', 'multi'];
    const tipe = validTipe.includes(b.tipe) ? b.tipe : 'vip';
    const platform = validPlatform.includes(b.platform) ? b.platform : 'tiktok';
    const produk = Array.isArray(b.produk) ? b.produk.slice(0, 50).map(p => String(p).slice(0, 100)) : [];

    const payload = {
      username: String(b.username).replace('@', '').trim().slice(0, 100),
      nama: String(b.nama || '').slice(0, 150),
      tipe, komisi: String(b.komisi || '').slice(0, 20), platform,
      followers: String(b.followers || '').slice(0, 30),
      tanggal: b.tanggal || null,
      expire: b.expire || null,
      produk,
      notes: String(b.notes || '').slice(0, 1000)
    };

    if (b.id) {
      const { data, error } = await supabase
        .from('exclusive_creators')
        .update(payload)
        .eq('id', b.id)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, item: data });
    } else {
      const { data, error } = await supabase
        .from('exclusive_creators')
        .insert(payload)
        .select()
        .single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ success: true, item: data });
    }
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'Parameter id wajib diisi' });
    const { error } = await supabase.from('exclusive_creators').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
