// api/_period-utils.js
// Baca "periode" (rentang tanggal) dari nama file yang diupload, contoh:
//   "Sample_Analysis_Creator_List_20260601-20260630.xlsx" -> periode "20260601-20260630"
//   "Transaction_Analysis_Creator_List_20260601-20260630.xlsx" -> periode yang SAMA
// Dua file dengan angka periode yang sama dianggap 1 "arsip"/batch waktu yang sama
// (biasanya sepasang: 1 file sample + 1 file transaction untuk rentang tanggal itu).
// Dipakai bareng-bareng oleh podium.js, podium-periods.js, dan podium-reveal.js
// supaya cara baca & format periodenya konsisten di semua endpoint.

const PERIOD_RE = /(\d{8})-(\d{8})/;

function extractPeriod(fileName) {
  const m = PERIOD_RE.exec(String(fileName || ''));
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

function formatDate8(d) {
  if (!/^\d{8}$/.test(String(d || ''))) return d;
  return `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;
}

function formatPeriodLabel(period) {
  const [start, end] = String(period || '').split('-');
  if (!start || !end) return period || '';
  return `${formatDate8(start)} – ${formatDate8(end)}`;
}

module.exports = { extractPeriod, formatPeriodLabel };
