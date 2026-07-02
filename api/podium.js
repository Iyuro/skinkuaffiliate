// api/podium.js
// Endpoint PUBLIK (sengaja TIDAK pakai requireAuth) — dipanggil oleh halaman /podium.html
// yang bisa diakses siapa saja tanpa login. Cuma return data agregat top 3 (GMV & Video),
// bukan dump semua data mentah, dan username kreator disensor sebagian di server
// (jadi tidak bisa "dibuka" lewat DevTools/Network tab sekalipun).

const { getSupabase, setCors } = require('./_supabase');
const { mergeRows, fmtRp } = require('./_creator-logic');
const { extractPeriod, formatPeriodLabel } = require('./_period-utils');

// Sensor username: sisakan ±3 karakter pertama, sisanya jadi bintang.
// Contoh: "skinkubeauty" -> "ski*********"
function censorUsername(name) {
  if (!name) return '???';
  const visible = Math.min(3, Math.max(1, Math.floor(name.length / 3)));
  const head = name.slice(0, visible);
  const stars = '*'.repeat(Math.max(3, name.length - visible));
  return head + stars;
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const supabase = getSupabase();
    const period = req.query && req.query.period ? String(req.query.period).trim() : '';
    const filterByPeriod = period && period !== 'all';

    // Kalau ada filter periode, cari dulu file_id mana aja yang nama filenya
    // punya rentang tanggal (period) yang sama, baru ambil creator_rows dari file-file itu aja.
    let fileIds = null;
    if (filterByPeriod) {
      const { data: files, error: fErr } = await supabase.from('uploaded_files').select('id, file_name');
      if (fErr) return res.status(500).json({ error: fErr.message });
      fileIds = (files || []).filter(f => extractPeriod(f.file_name) === period).map(f => f.id);
      if (!fileIds.length) {
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');
        return res.status(200).json({
          topGmv: [], topVideo: [], allGmv: [], allVideo: [],
          totalCreators: 0, period, periodLabel: formatPeriodLabel(period),
          updatedAt: new Date().toISOString()
        });
      }
    }

    let rowsQuery = supabase.from('creator_rows').select('*');
    if (fileIds) rowsQuery = rowsQuery.in('file_id', fileIds);
    const { data: rawRows, error } = await rowsQuery;
    if (error) return res.status(500).json({ error: error.message });

    const appRows = (rawRows || []).map(r => ({
      name: r.name, sampelDiminta: r.sampel_diminta || 0, sampelTerkirim: r.sampel_terkirim || 0,
      videoSampel: r.video_sampel || 0, liveSampel: r.live_sampel || 0, gmv: r.gmv || 0,
      roi45: r.roi45 || 0, roi90: r.roi90 || 0, orders: r.orders || 0, src: r.src || 'sample'
    }));
    const allData = mergeRows(appRows);

    const allSorted_gmv = [...allData].sort((a, b) => b.gmv - a.gmv)
      .map((r, i) => ({ rank: i+1, username: censorUsername(r.name), gmv: r.gmv, gmvFormatted: fmtRp(r.gmv), video: r.videoSampel, sampelTerkirim: r.sampelTerkirim }));

    const allSorted_video = [...allData].sort((a, b) => b.videoSampel - a.videoSampel)
      .map((r, i) => ({ rank: i+1, username: censorUsername(r.name), video: r.videoSampel, gmv: r.gmv, gmvFormatted: fmtRp(r.gmv), sampelTerkirim: r.sampelTerkirim }));

    const topGmv = allSorted_gmv.slice(0, 3);
    const topVideo = allSorted_video.slice(0, 3);

    res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=120');

    return res.status(200).json({
      topGmv, topVideo,
      allGmv: allSorted_gmv,
      allVideo: allSorted_video,
      totalCreators: allData.length,
      period: filterByPeriod ? period : 'all',
      periodLabel: filterByPeriod ? formatPeriodLabel(period) : 'Semua Waktu',
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
