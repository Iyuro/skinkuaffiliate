// ============ ACTIVITY LOG (Settings) ============
// Nampilin histori aktivitas dari tabel activity_log (lihat api/activity-log.js).
// Identitas "siapa"-nya otomatis dari IP + device/browser (bukan nama akun),
// karena sistem ini masih pakai 1 kode OTP bareng buat semua yang login.

const ACTIVITY_LABELS = {
  upload_file:      { icon: '📤', label: 'Upload file' },
  delete_file:      { icon: '🗑️', label: 'Hapus file' },
  add_exclusive:    { icon: '⭐', label: 'Tambah kreator Exclusive' },
  update_exclusive: { icon: '✏️', label: 'Update kreator Exclusive' },
  delete_exclusive: { icon: '🗑️', label: 'Hapus kreator Exclusive' },
  login_success:    { icon: '🔓', label: 'Login berhasil' },
  login_failed:     { icon: '⛔', label: 'Login gagal' },
  otp_requested:    { icon: '📨', label: 'Minta kode OTP' },
  logout:           { icon: '🚪', label: 'Logout' },
  page_view:        { icon: '👁️', label: 'Buka halaman' },
  resync_data:      { icon: '🔄', label: 'Sync ulang data' },
};

function activityTimeAgo(iso){
  if(!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if(min < 1) return 'Baru saja';
  if(min < 60) return `${min} menit lalu`;
  const hr = Math.floor(min / 60);
  if(hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if(day < 7) return `${day} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID',{ day:'2-digit', month:'short', year:'numeric' });
}

async function loadActivityLog(){
  const listEl = document.getElementById('activityLogList');
  if(!listEl) return; // panel belum ke-render (misal belum pernah buka Settings)
  listEl.innerHTML = '<div class="activity-empty">⏳ Memuat log...</div>';
  try{
    const filterEl = document.getElementById('activityFilter');
    const action = filterEl ? filterEl.value : '';
    const { logs } = await apiGetActivityLog(action, 150);
    renderActivityLog(logs || []);
  }catch(err){
    listEl.innerHTML = `<div class="activity-empty" style="color:var(--red)">⚠️ ${escapeHtml(err.message)}</div>`;
  }
}

function renderActivityLog(logs){
  const listEl = document.getElementById('activityLogList');
  if(!listEl) return;
  if(!logs.length){
    listEl.innerHTML = '<div class="activity-empty">Belum ada aktivitas tercatat untuk filter ini</div>';
    return;
  }
  listEl.innerHTML = logs.map(l => {
    const meta = ACTIVITY_LABELS[l.action] || { icon: '📋', label: l.action };
    const deviceTxt = [l.device_type, l.os, l.browser].filter(Boolean).join(' · ');
    return `<div class="activity-row">
      <div class="activity-icon">${meta.icon}</div>
      <div class="activity-info">
        <div class="activity-label">${escapeHtml(meta.label)}${l.detail ? ` <span class="activity-detail">— ${escapeHtml(l.detail)}</span>` : ''}</div>
        <div class="activity-meta">${activityTimeAgo(l.created_at)} &middot; 🌐 ${escapeHtml(l.ip || '?')} &middot; ${escapeHtml(deviceTxt || 'Unknown device')}</div>
      </div>
    </div>`;
  }).join('');
}
