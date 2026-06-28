// ============ TIKTOK LINK HELPER ============
// Modul kecil buat ubah nama/username kreator jadi link otomatis ke profil TikTok-nya.
// Dipakai di: Kreator List (tabel utama), Dashboard (Top Perform/Ghost/Rekomendasi),
// dan Affiliate Exclusive (kartu kreator VIP/Kontrak).

/**
 * Bersihin username biar jadi format yang valid buat URL TikTok.
 * Buang karakter '@', spasi, dan simbol aneh yang kadang nyangkut dari hasil export Excel.
 */
function cleanTiktokUsername(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .replace(/^@/, '')          // buang @ di depan kalau ada
    .replace(/\s+/g, '')        // buang spasi
    .replace(/[^a-zA-Z0-9._]/g, ''); // sisain karakter yang valid buat username tiktok
}

/** Bangun URL profil TikTok dari username. */
function tiktokProfileUrl(name) {
  const u = cleanTiktokUsername(name);
  return u ? `https://www.tiktok.com/@${u}` : '#';
}

/** Icon kecil TikTok (inline SVG, ikut warna teks current color). */
const TIKTOK_ICON_SVG = '<svg class="tt-ico" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M16.6 5.82c-.93-.62-1.6-1.58-1.83-2.7h-3.07v12.2c0 1.48-1.2 2.68-2.68 2.68a2.68 2.68 0 0 1 0-5.36c.25 0 .48.04.71.1V9.6a5.78 5.78 0 0 0-.71-.05A5.78 5.78 0 0 0 3.24 15.3 5.78 5.78 0 0 0 9 21.1a5.78 5.78 0 0 0 5.78-5.78V9.4a7.5 7.5 0 0 0 4.38 1.4V7.7a4.85 4.85 0 0 1-2.56-1.88Z"/></svg>';

/**
 * Render <a> yang langsung ngelink ke profil TikTok kreator.
 * @param {string} name - username/nama kreator
 * @param {object} opts - { showIcon: boolean, bold: boolean, extraClass: string }
 */
function renderCreatorLink(name, opts) {
  opts = opts || {};
  const showIcon = opts.showIcon !== false; // default true
  const clean = cleanTiktokUsername(name);
  const url = clean ? `https://www.tiktok.com/@${clean}` : '#';
  const cls = `creator-link${opts.extraClass ? ' ' + opts.extraClass : ''}`;
  // Pakai username yang sudah dibersihkan buat label, supaya tidak dobel '@@'
  // kalau data aslinya udah mengandung '@', dan supaya aman dari karakter HTML liar.
  const label = `@${escapeHtml(clean || name)}`;
  const icon = showIcon ? TIKTOK_ICON_SVG : '';
  if (!clean) {
    // Username kosong/tidak valid setelah dibersihkan → tampil sebagai teks biasa, jangan jadi link mati.
    return `<span class="${cls}" style="cursor:default;opacity:.7">${label}</span>`;
  }
  return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${cls}" title="Buka profil TikTok @${clean}" onclick="event.stopPropagation()">${icon}${label}</a>`;
}

/** Escape karakter HTML dasar supaya nama kreator dari data Excel tidak bisa nyuntik tag/markup. */
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
