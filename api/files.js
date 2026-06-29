// api/files.js
// Kelola file upload: GET (list semua file + creator_rows-nya), POST (simpan file baru),
// DELETE (hapus 1 file spesifik beserta semua creator_rows terkait, via ?id=...)

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

  // ---------- GET: ambil semua file + semua creator_rows ----------
  if (req.method === 'GET') {
    const { data: files, error: fErr } = await supabase
      .from('uploaded_files')
      .select('*')
      .order('uploaded_at', { ascending: true });
    if (fErr) return res.status(500).json({ error: fErr.message });

    const { data: rows, error: rErr } = await supabase
      .from('creator_rows')
      .select('*')
      .order('created_at', { ascending: true });
    if (rErr) return res.status(500).json({ error: rErr.message });

    return res.status(200).json({ files: files || [], rows: rows || [] });
  }

  // ---------- POST: simpan file baru + rows hasil parsing ----------
  if (req.method === 'POST') {
    const { fileName, fileType, rows } = req.body || {};
    if (!fileName || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'fileName dan rows (array) wajib diisi' });
    }
    // Validasi dasar: batasi ukuran input supaya endpoint ini tidak bisa dipakai
    // buat membanjiri Supabase dengan payload raksasa (defense terhadap DoS sederhana).
    if (fileName.length > 255) return res.status(400).json({ error: 'Nama file terlalu panjang (maks 255 karakter)' });
    if (rows.length > 5000) return res.status(400).json({ error: 'Terlalu banyak baris dalam satu file (maks 5000)' });

    const { data: fileRow, error: fErr } = await supabase
      .from('uploaded_files')
      .insert({ file_name: String(fileName).slice(0, 255), file_type: fileType || 'unknown', row_count: rows.length })
      .select()
      .single();
    if (fErr) return res.status(500).json({ error: fErr.message });

    if (rows.length) {
      const payload = rows.map(r => ({
        file_id: fileRow.id,
        name: String(r.name || '').slice(0, 200),
        sampel_diminta: Number(r.sampelDiminta) || 0,
        sampel_terkirim: Number(r.sampelTerkirim) || 0,
        video_sampel: Number(r.videoSampel) || 0,
        live_sampel: Number(r.liveSampel) || 0,
        gmv: Number(r.gmv) || 0,
        roi45: Number(r.roi45) || 0,
        roi90: Number(r.roi90) || 0,
        orders: Number(r.orders) || 0,
        komisi: Number(r.komisi) || 0,
        refund: Number(r.refund) || 0,
        aov: Number(r.aov) || 0,
        src: r.src === 'transaction' ? 'transaction' : 'sample'
      }));
      const { error: rErr } = await supabase.from('creator_rows').insert(payload);
      if (rErr) return res.status(500).json({ error: rErr.message });
    }

    return res.status(200).json({ success: true, file: fileRow });
  }

  // ---------- DELETE: hapus 1 file (creator_rows ikut terhapus via CASCADE) ----------
  if (req.method === 'DELETE') {
    const fileId = req.query?.id || (req.body && req.body.id);
    if (!fileId) return res.status(400).json({ error: 'Parameter id wajib diisi' });

    const { error } = await supabase.from('uploaded_files').delete().eq('id', fileId);
    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
