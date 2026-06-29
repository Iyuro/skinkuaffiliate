// api/_creator-logic.js
// Port server-side dari logic getStatus/getSaran/getBadge yang ada di js/utils.js (browser).
// Dipakai oleh api/telegram-webhook.js supaya bot bisa menghitung status kreator
// (perform/boncos/ghost/dll) tanpa harus lewat browser.
//
// CATATAN: settings.roiPerform & gmvOrganic di app browser masih disimpan di localStorage
// (per-device, belum sinkron ke server) — jadi di sini dipakai default yang sama
// (roiPerform=3, gmvOrganic=100000) supaya hasilnya konsisten dengan default UI.
// Kalau nanti setting ini dipindah ke Supabase juga, file ini tinggal disesuaikan.
const DEFAULT_SETTINGS = { roiPerform: 3, gmvOrganic: 100000 };

function fmtRp(v) {
  if (!v) return 'Rp 0';
  if (v >= 1000000000) return 'Rp ' + (v / 1000000000).toFixed(1) + 'M';
  if (v >= 1000000) return 'Rp ' + (v / 1000000).toFixed(1) + 'jt';
  if (v >= 1000) return 'Rp ' + Math.round(v / 1000) + 'rb';
  return 'Rp ' + Math.round(v);
}

function getStatus(r, settings) {
  settings = settings || DEFAULT_SETTINGS;
  const k = r.sampelTerkirim, d = r.sampelDiminta, v = r.videoSampel, gmv = r.gmv, roi = r.roi45;
  if (k > 0 && v === 0 && gmv === 0) return 'pending';
  if (roi > 0) {
    if (roi >= settings.roiPerform) return 'perform';
    if (roi >= 1) return 'breakeven';
    return 'boncos';
  }
  if (k > 0 && gmv > 0) {
    if (gmv >= 500000) return 'perform';
    if (gmv >= 100000) return 'breakeven';
    return 'boncos';
  }
  if (k === 0 && gmv > 0) return 'potential';
  if (d > 0 && k === 0) return 'requested';
  return 'nodata';
}

function getSaran(r, settings) {
  const st = getStatus(r, settings);
  const conv = r.sampelTerkirim > 0 ? r.videoSampel / r.sampelTerkirim : 0;
  const m = {
    perform: conv >= 1
      ? { icon: '✅', text: 'Kirim sampel lagi. Konversi bagus & ROI positif.', a: 'prioritas' }
      : { icon: '✅', text: 'Perform dari GMV. Kirim lagi, minta aktif posting.', a: 'prioritas' },
    boncos: { icon: '❌', text: 'ROI < 1x. Stop kirim. Minta komitmen posting dulu.', a: 'stop' },
    breakeven: r.videoSampel >= 3
      ? { icon: '🔄', text: 'Break-even. Coba 1 sampel lagi.', a: 'coba' }
      : { icon: '🔄', text: 'Break-even. Evaluasi dulu sebelum kirim baru.', a: 'evaluasi' },
    pending: r.sampelTerkirim >= 3
      ? { icon: '⛔', text: `Dapat ${r.sampelTerkirim} sampel, 0 video. Blacklist.`, a: 'blacklist' }
      : { icon: '⏳', text: `Dapat ${r.sampelTerkirim} sampel, belum posting. Tunggu 14 hari.`, a: 'tunggu' },
    potential: r.gmv >= 500000
      ? { icon: '🎯', text: `GMV ${fmtRp(r.gmv)} organic. Prioritas utama.`, a: 'prioritas' }
      : { icon: '🔵', text: 'Ada GMV organic. Worth to try 1 sampel.', a: 'coba' },
    requested: { icon: '📋', text: `Minta ${r.sampelDiminta}x, belum dikirim. Review profil dulu.`, a: 'review' },
    nodata: { icon: '⏸', text: 'Belum ada aktivitas. Skip dulu.', a: 'skip' }
  };
  return m[st] || m.nodata;
}

function isGhost(r) {
  return r.sampelTerkirim > 0 && r.videoSampel === 0 && r.gmv === 0;
}

// Sama seperti mergeData di js/utils.js: gabungkan baris dengan nama sama, ambil nilai max tiap kolom.
function mergeRows(rows) {
  const map = {};
  rows.forEach(r => {
    if (!r.name) return;
    if (!map[r.name]) { map[r.name] = Object.assign({}, r); return; }
    const e = map[r.name];
    ['sampelDiminta', 'sampelTerkirim', 'videoSampel', 'liveSampel', 'gmv', 'roi45', 'roi90', 'orders', 'komisi', 'refund', 'aov'].forEach(k => {
      e[k] = Math.max(e[k] || 0, r[k] || 0);
    });
    if (r.src === 'transaction') e.src = 'transaction';
  });
  return Object.values(map);
}

module.exports = { getStatus, getSaran, getBadge: null, isGhost, mergeRows, fmtRp, DEFAULT_SETTINGS };
