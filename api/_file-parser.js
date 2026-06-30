// api/_file-parser.js
// Port server-side dari js/utils.js (detectType + parseRows) supaya bot Telegram
// bisa parse file Excel/CSV yang dikirim user langsung di chat, tanpa perlu buka
// website. Logic HARUS persis sama dengan js/utils.js biar hasil parsing konsisten
// baik upload lewat web maupun lewat bot.

const XLSX = require('xlsx');

function parseRp(v) {
  if (!v && v !== 0) return 0;
  if (typeof v === 'number') return v;
  return parseInt(String(v).replace(/[^0-9]/g, '')) || 0;
}

function detectType(headers) {
  const hl = headers.map(x => String(x || '').toLowerCase());
  if (hl.some(x => x.includes('gmv dari kreator') || x.includes('pesanan teratribusi'))) return 'transaction';
  if (hl.some(x => x.includes('gmv konten') || x.includes('roi 45'))) return 'sample';
  return 'unknown';
}

function parseRows(data, type) {
  if (type === 'sample') {
    return data.map(r => ({
      name: String(r['Creator name'] || r['creator name'] || '').trim(),
      sampelDiminta: parseInt(r['Sampel yang diminta'] || 0),
      sampelTerkirim: parseInt(r['Sampel terkirim'] || 0),
      videoSampel: parseInt(r['Video dengan sampel'] || 0),
      liveSampel: parseInt(r['Siaran LIVE dengan sampel'] || 0),
      gmv: parseRp(r['GMV Konten'] || r['GMV konten'] || 0),
      roi45: parseFloat(r['ROI 45 hari'] || 0),
      roi90: parseFloat(r['ROI 90 hari'] || 0),
      orders: 0, komisi: 0, refund: 0, aov: 0, src: 'sample'
    }));
  }
  if (type === 'transaction') {
    return data.map(r => ({
      name: String(r['Creator name'] || r['creator name'] || '').trim(),
      sampelDiminta: 0,
      sampelTerkirim: parseInt(r['Sampel terkirim'] || 0),
      videoSampel: parseInt(r['Video'] || 0),
      liveSampel: parseInt(r['Siaran LIVE'] || 0),
      gmv: parseRp(r['GMV dari kreator'] || 0),
      roi45: 0, roi90: 0,
      orders: parseInt(r['Pesanan teratribusi'] || 0),
      komisi: parseRp(r['Perkiraan komisi'] || 0),
      refund: parseRp(r['Pengembalian dana'] || 0),
      aov: parseRp(r['AOV'] || 0),
      src: 'transaction'
    }));
  }
  return [];
}

// Parse buffer file (xlsx/xls/csv) jadi { sheets: [{ type, rows }] }.
// XLSX.read bisa baca CSV juga (otomatis deteksi dari isi), jadi satu fungsi cukup.
function parseFileBuffer(buffer, fileNameHint) {
  const ext = (fileNameHint || '').toLowerCase().split('.').pop();
  const SUPPORTED = ['xlsx', 'xls', 'csv'];
  if (!SUPPORTED.includes(ext)) {
    return { error: `unsupported_format:${ext || 'unknown'}` };
  }

  let wb;
  try {
    wb = XLSX.read(buffer, { type: 'buffer' });
  } catch (err) {
    return { error: 'parse_failed:' + err.message };
  }

  const results = [];
  for (const sheetName of wb.SheetNames) {
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    if (!raw.length) continue;
    const type = detectType(Object.keys(raw[0]));
    const parsed = parseRows(raw, type).filter(r => r.name);
    if (!parsed.length) continue;
    results.push({ sheetName, type, rows: parsed });
  }

  if (!results.length) {
    return { error: 'no_recognizable_data' };
  }
  return { sheets: results };
}

module.exports = { detectType, parseRows, parseFileBuffer, parseRp };
