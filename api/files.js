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

    const { data: fileRow, error: fErr } = await supabase
      .from('uploaded_files')
      .insert({ file_name: fileName, file_type: fileType || 'unknown', row_count: rows.length })
      .select()
      .single();
    if (fErr) return res.status(500).json({ error: fErr.message });

    if (rows.length) {
      const payload = rows.map(r => ({
        file_id: fileRow.id,
        name: r.name || '',
        sampel_diminta: r.sampelDiminta || 0,
        sampel_terkirim: r.sampelTerkirim || 0,
        video_sampel: r.videoSampel || 0,
        live_sampel: r.liveSampel || 0,
        gmv: r.gmv || 0,
        roi45: r.roi45 || 0,
        roi90: r.roi90 || 0,
        orders: r.orders || 0,
        komisi: r.komisi || 0,
        refund: r.refund || 0,
        aov: r.aov || 0,
        src: r.src || 'sample'
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
