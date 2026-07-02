// api/podium-periods.js
// Endpoint PUBLIK — dipanggil oleh /podium.html buat ngisi dropdown filter periode/arsip.
// Ngambil daftar nama file yang udah diupload, terus baca angka rentang tanggal di
// nama filenya (lihat _period-utils.js), dikelompokkin jadi daftar periode unik.

const { getSupabase, setCors } = require('./_supabase');
const { extractPeriod, formatPeriodLabel } = require('./_period-utils');

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const { data: files, error } = await supabase
      .from('uploaded_files')
      .select('id, file_name, uploaded_at');
    if (error) return res.status(500).json({ error: error.message });

    const map = {};
    (files || []).forEach(f => {
      const period = extractPeriod(f.file_name);
      if (!period) return; // file tanpa pola tanggal di namanya diabaikan (tetap masuk hitungan "Semua Waktu")
      if (!map[period]) {
        map[period] = {
          period,
          label: formatPeriodLabel(period),
          start: period.split('-')[0],
          end: period.split('-')[1],
          fileCount: 0
        };
      }
      map[period].fileCount += 1;
    });

    // Urut dari periode paling baru ke paling lama.
    const periods = Object.values(map).sort((a, b) => b.start.localeCompare(a.start));

    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
    return res.status(200).json({ periods, totalFiles: (files || []).length });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
