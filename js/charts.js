// ============ GRAFIK (Chart.js) ============
// 4 grafik actionable — warna solid agar tetap keliatan di light mode maupun dark mode.

let chartInstances = { statusDist:null, funnel:null, roiDist:null, topRoi:null };
let _chartRetryTimer = null;

// Warna solid — tidak bergantung CSS var, agar keliatan di semua tema
const C = {
  green  : '#16a34a', greenBg : 'rgba(22,163,74,0.15)',
  amber  : '#d97706', amberBg : 'rgba(217,119,6,0.15)',
  red    : '#dc2626', redBg   : 'rgba(220,38,38,0.15)',
  indigo : '#4f46e5', indigoBg: 'rgba(79,70,229,0.15)',
  purple : '#7c3aed', purpleBg: 'rgba(124,58,237,0.15)',
  pink   : '#db2777', pinkBg  : 'rgba(219,39,119,0.15)',
  gray   : '#6b7280', grayBg  : 'rgba(107,114,128,0.15)',
  sky    : '#0284c7', skyBg   : 'rgba(2,132,199,0.15)',
};

function isLight(){ return document.documentElement.dataset.theme === 'light'; }
function textColor(){ return isLight() ? '#374151' : '#c4c4d4'; }
function gridColor(){ return isLight() ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'; }
function bgColor(){ return isLight() ? '#ffffff' : 'transparent'; }

const STATUS_META = {
  perform  : { label:'🔥 Perform',       color: C.green  },
  breakeven: { label:'🔄 Break-even',    color: C.amber  },
  boncos   : { label:'❌ Boncos',        color: C.red    },
  potential: { label:'🔵 Potensi',       color: C.indigo },
  pending  : { label:'⏳ Belum Posting', color: C.purple },
  requested: { label:'📋 Minta Sampel',  color: C.pink   },
  nodata   : { label:'⏸ No Data',       color: C.gray   },
};

function destroyChart(key){
  if(chartInstances[key]){ chartInstances[key].destroy(); chartInstances[key]=null; }
}

function renderCharts(){
  if(typeof Chart === 'undefined') return;
  if(!allData || !allData.length) return;

  const probe = document.getElementById('chartStatusDist');
  if(!probe) return;
  if(probe.offsetWidth === 0){
    if(_chartRetryTimer) clearTimeout(_chartRetryTimer);
    if(window.ResizeObserver && !probe._obs){
      probe._obs = new ResizeObserver(entries => {
        for(const e of entries){
          if(e.contentRect.width > 0){
            probe._obs.disconnect(); probe._obs = null;
            requestAnimationFrame(() => renderCharts());
            break;
          }
        }
      });
      probe._obs.observe(probe);
    } else {
      _chartRetryTimer = setTimeout(() => renderCharts(), 100);
    }
    return;
  }

  renderStatusDistChart();
  renderFunnelChart();
  renderRoiDistChart();
  renderTopRoiChart();
}

// ── Chart 1: Donut distribusi status ──────────────────────────────────────────
function renderStatusDistChart(){
  const canvas = document.getElementById('chartStatusDist');
  if(!canvas) return;
  destroyChart('statusDist');
  if(!allData.length) return;

  const counts = {};
  allData.forEach(r => { const s = getStatus(r); counts[s] = (counts[s]||0) + 1; });
  const keys = Object.keys(STATUS_META).filter(k => counts[k] > 0);
  if(!keys.length) return;

  const total = keys.reduce((a,k) => a + counts[k], 0);
  chartInstances.statusDist = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: keys.map(k => STATUS_META[k].label),
      datasets: [{ data: keys.map(k => counts[k]), backgroundColor: keys.map(k => STATUS_META[k].color), borderWidth: 3, borderColor: bgColor(), hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      plugins: {
        legend: { position: 'right', labels: { color: textColor(), font: { size: 11 }, boxWidth: 12, padding: 12, generateLabels: chart => {
          const ds = chart.data.datasets[0];
          return chart.data.labels.map((l,i) => ({
            text: `${l}  ${ds.data[i]} (${((ds.data[i]/total)*100).toFixed(0)}%)`,
            fillStyle: ds.backgroundColor[i], strokeStyle: ds.backgroundColor[i], lineWidth: 0, hidden: false, index: i
          }));
        }}},
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} kreator (${((ctx.parsed/total)*100).toFixed(0)}%)` } }
      }
    }
  });
}

// ── Chart 2: Funnel konversi horizontal bar ───────────────────────────────────
function renderFunnelChart(){
  const canvas = document.getElementById('chartFunnel');
  if(!canvas) return;
  destroyChart('funnel');
  if(!allData.length) return;

  const total      = allData.length;
  const dptSampel  = allData.filter(r => r.sampelTerkirim > 0).length;
  const posting    = allData.filter(r => r.sampelTerkirim > 0 && r.videoSampel > 0).length;
  const closing    = allData.filter(r => r.sampelTerkirim > 0 && r.videoSampel > 0 && r.gmv > 0).length;

  const pct = v => total > 0 ? ((v/total)*100).toFixed(0)+'%' : '0%';

  chartInstances.funnel = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: [`Total Kreator (${total})`, `Dapat Sampel (${pct(dptSampel)})`, `Posting Video (${pct(posting)})`, `Closing GMV (${pct(closing)})`],
      datasets: [{
        data: [total, dptSampel, posting, closing],
        backgroundColor: [C.sky, C.indigo, C.amber, C.green],
        borderRadius: 6, maxBarThickness: 40,
      }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.x} kreator (${((ctx.parsed.x/total)*100).toFixed(0)}%)` } }
      },
      scales: {
        x: { ticks: { color: textColor(), font: { size: 10 } }, grid: { color: gridColor() }, beginAtZero: true },
        y: { ticks: { color: textColor(), font: { size: 11 } }, grid: { display: false } }
      }
    }
  });
}

// ── Chart 3: Distribusi ROI bucket ───────────────────────────────────────────
function renderRoiDistChart(){
  const canvas = document.getElementById('chartRoiDist');
  if(!canvas) return;
  destroyChart('roiDist');
  const withRoi = allData.filter(r => r.roi45 > 0);
  if(!withRoi.length) return;

  const buckets = [
    { label:'< 1x',  min:0,   max:1,        color: C.red    },
    { label:'1–2x',  min:1,   max:2,         color: C.amber  },
    { label:'2–3x',  min:2,   max:3,         color: C.sky    },
    { label:'3–5x',  min:3,   max:5,         color: C.indigo },
    { label:'5–10x', min:5,   max:10,        color: C.purple },
    { label:'10x+',  min:10,  max:Infinity,  color: C.green  },
  ];
  const counts = buckets.map(b => withRoi.filter(r => r.roi45 >= b.min && r.roi45 < b.max).length);

  chartInstances.roiDist = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: buckets.map(b => b.label),
      datasets: [{ data: counts, backgroundColor: buckets.map(b => b.color), borderRadius: 6, maxBarThickness: 52 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} kreator` } }
      },
      scales: {
        x: { ticks: { color: textColor(), font: { size: 12 }, }, grid: { display: false } },
        y: { ticks: { color: textColor(), font: { size: 10 }, stepSize: 1 }, grid: { color: gridColor() }, beginAtZero: true }
      }
    }
  });
}

// ── Chart 4: Top 10 ROI tertinggi horizontal bar ─────────────────────────────
function renderTopRoiChart(){
  const canvas = document.getElementById('chartTopRoi');
  if(!canvas) return;
  destroyChart('topRoi');
  const top = [...allData].filter(r => r.roi45 > 0).sort((a,b) => b.roi45 - a.roi45).slice(0,10);
  if(!top.length) return;

  chartInstances.topRoi = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: top.map(r => '@' + r.name),
      datasets: [{
        label: 'ROI 45h',
        data: top.map(r => r.roi45),
        backgroundColor: top.map(r => r.roi45 >= 5 ? C.green : r.roi45 >= 2 ? C.indigo : C.amber),
        borderRadius: 5, maxBarThickness: 22,
      }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ROI ${ctx.parsed.x.toFixed(1)}x · GMV ${fmtRp(top[ctx.dataIndex].gmv)}` } }
      },
      scales: {
        x: { ticks: { color: textColor(), font: { size: 10 }, callback: v => v+'x' }, grid: { color: gridColor() }, beginAtZero: true },
        y: { ticks: { color: textColor(), font: { size: 10 } }, grid: { display: false } }
      }
    }
  });
}
