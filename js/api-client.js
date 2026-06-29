// ============ API CLIENT (Supabase via /api/*) ============
// Semua komunikasi ke backend lewat file ini, supaya kalau ada perubahan
// endpoint/format nanti, cukup diubah di satu tempat.

function authHeaders() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken };
}

// ---------- FILES ----------
async function apiGetFiles() {
  const res = await fetch('/api/files', { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Gagal ambil data file');
  return res.json(); // { files, rows }
}

async function apiSaveFile(fileName, fileType, rows) {
  const res = await fetch('/api/files', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ fileName, fileType, rows })
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Gagal simpan file');
  return res.json();
}

async function apiDeleteFile(fileId) {
  const res = await fetch('/api/files?id=' + encodeURIComponent(fileId), {
    method: 'DELETE', headers: authHeaders()
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Gagal hapus file');
  return res.json();
}

// ---------- EXCLUSIVE ----------
async function apiGetExclusive() {
  const res = await fetch('/api/exclusive', { headers: authHeaders() });
  if (!res.ok) throw new Error((await res.json()).error || 'Gagal ambil data exclusive');
  return res.json(); // { items }
}

async function apiSaveExclusive(item) {
  const res = await fetch('/api/exclusive', {
    method: 'POST', headers: authHeaders(), body: JSON.stringify(item)
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Gagal simpan kreator exclusive');
  return res.json();
}

async function apiDeleteExclusive(id) {
  const res = await fetch('/api/exclusive?id=' + encodeURIComponent(id), {
    method: 'DELETE', headers: authHeaders()
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Gagal hapus kreator exclusive');
  return res.json();
}

// ---------- KONVERSI row Supabase (snake_case) ↔ row internal app (camelCase) ----------
// Supabase nyimpen kolom dengan nama snake_case (sampel_diminta, dst), sedangkan
// seluruh logic existing app ini (getStatus, getSaran, dashboard, dll) pakai camelCase.
// Fungsi ini menjembatani dua format itu di satu tempat saja.
function dbRowToAppRow(r) {
  return {
    name: r.name,
    sampelDiminta: r.sampel_diminta || 0,
    sampelTerkirim: r.sampel_terkirim || 0,
    videoSampel: r.video_sampel || 0,
    liveSampel: r.live_sampel || 0,
    gmv: r.gmv || 0,
    roi45: r.roi45 || 0,
    roi90: r.roi90 || 0,
    orders: r.orders || 0,
    komisi: r.komisi || 0,
    refund: r.refund || 0,
    aov: r.aov || 0,
    src: r.src || 'sample',
    file_id: r.file_id,
    created_at: r.created_at
  };
}

function dbExclusiveToApp(r) {
  return {
    id: r.id,
    username: r.username,
    nama: r.nama || '',
    tipe: r.tipe || 'vip',
    komisi: r.komisi || '',
    platform: r.platform || 'tiktok',
    followers: r.followers || '',
    tanggal: r.tanggal || '',
    expire: r.expire || '',
    produk: r.produk || [],
    notes: r.notes || '',
    addedAt: r.added_at
  };
}
