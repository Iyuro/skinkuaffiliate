// ============ GRAFIK (Chart.js) ============
// 4 grafik di Dashboard, fokus ke actionable insight (bukan cuma ranking mentah):
// 1. Donut distribusi status kreator (Perform/Break-even/Boncos/Potensi/Belum Posting/dst)
// 2. Funnel konversi: Sampel Terkirim -> Posting Video -> Closing GMV
// 3. Histogram distribusi ROI 45 hari (berapa kreator di tiap rentang ROI)
// 4. Bar horizontal Top 10 ROI tertinggi (kreator paling efisien, bukan cuma GMV terbesar)

let chartInstances = { statusDist:null, funnel:null, roiDist:null, topRoi:null };

const CHART_COLORS = {
  accent: '#818cf8', accent2: '#6366f1', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', purple: '#a855f7', pink:'#ec4899', text2: '#9090aa', grid: 'rgba(255,255,255,0.06)'
};

const STATUS_META = {
  perform:    { label:'🔥 Perform',      color: CHART_COLORS.green  },
  breakeven:  { label:'🔄 Break-even',   color: CHART_COLORS.amber  },
  boncos:     { label:'❌ Boncos',       color: CHART_COLORS.red    },
  potential:  { label:'🔵 Potensi',      color: CHART_COLORS.accent },
  pending:    { label:'⏳ Belum Posting',color: CHART_COLORS.purple },
  requested:  { label:'📋 Minta Sampel', color: CHART_COLORS.pink   },
  nodata:     { label:'⏸ Tidak Ada Data',color: CHART_COLORS.text2 }
};

function destroyChart(key){
  if(chartInstances[key]){ chartInstances[key].destroy(); chartInstances[key]=null; }
}

function baseChartOptions(extra){
  return Object.assign({
    responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ labels:{ color:CHART_COLORS.text2, font:{ size:11 } } }, tooltip:{ titleFont:{size:12}, bodyFont:{size:12} } },
    scales:{
      x:{ ticks:{ color:CHART_COLORS.text2, font:{ size:10 } }, grid:{ color:CHART_COLORS.grid } },
      y:{ ticks:{ color:CHART_COLORS.text2, font:{ size:10 } }, grid:{ color:CHART_COLORS.grid }, beginAtZero:true }
    }
  }, extra||{});
}

function renderCharts(){
  if(typeof Chart==='undefined')return; // CDN belum kelar load, skip diam-diam
  renderStatusDistChart();
  renderFunnelChart();
  renderRoiDistChart();
  renderTopRoiChart();
}

// ---------- Chart 1: Distribusi status kreator (donut) ----------
function renderStatusDistChart(){
  const canvas=document.getElementById('chartStatusDist');
  if(!canvas)return;
  destroyChart('statusDist');
  if(!allData.length)return;

  const counts={};
  allData.forEach(r=>{ const s=getStatus(r); counts[s]=(counts[s]||0)+1; });
  const keys=Object.keys(STATUS_META).filter(k=>counts[k]>0);
  if(!keys.length)return;

  const ctx=canvas.getContext('2d');
  chartInstances.statusDist=new Chart(ctx,{
    type:'doughnut',
    data:{
      labels:keys.map(k=>STATUS_META[k].label),
      datasets:[{ data:keys.map(k=>counts[k]), backgroundColor:keys.map(k=>STATUS_META[k].color), borderWidth:0, hoverOffset:6 }]
    },
    options:{
      responsive:true, maintainAspectRatio:false, cutout:'62%',
      plugins:{
        legend:{ position:'right', labels:{ color:CHART_COLORS.text2, font:{size:11}, boxWidth:12, padding:10 } },
        tooltip:{ callbacks:{ label:ctx=>{ const total=keys.reduce((a,k)=>a+counts[k],0); const pct=((ctx.parsed/total)*100).toFixed(0); return `${ctx.label}: ${ctx.parsed} kreator (${pct}%)`; } } }
      }
    }
  });
}

// ---------- Chart 2: Funnel konversi Sampel -> Video -> GMV ----------
function renderFunnelChart(){
  const canvas=document.getElementById('chartFunnel');
  if(!canvas)return;
  destroyChart('funnel');
  if(!allData.length)return;

  const sampelTerkirim=allData.filter(r=>r.sampelTerkirim>0).length;
  const posting=allData.filter(r=>r.sampelTerkirim>0 && r.videoSampel>0).length;
  const closing=allData.filter(r=>r.sampelTerkirim>0 && r.videoSampel>0 && r.gmv>0).length;
  if(sampelTerkirim===0)return;

  const ctx=canvas.getContext('2d');
  chartInstances.funnel=new Chart(ctx,{
    type:'bar',
    data:{
      labels:['📦 Dapat Sampel','🎬 Posting Video','💰 Closing GMV'],
      datasets:[{
        data:[sampelTerkirim,posting,closing],
        backgroundColor:[CHART_COLORS.accent2,CHART_COLORS.amber,CHART_COLORS.green],
        borderRadius:6, maxBarThickness:46
      }]
    },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{display:false},
        tooltip:{ callbacks:{ label:ctx=>{ const pct=sampelTerkirim>0?((ctx.parsed.x/sampelTerkirim)*100).toFixed(0):0; return `${ctx.parsed.x} kreator (${pct}% dari yang dapat sampel)`; } } }
      },
      scales:{
        x:{ ticks:{ color:CHART_COLORS.text2, font:{size:10} }, grid:{ color:CHART_COLORS.grid }, beginAtZero:true },
        y:{ ticks:{ color:CHART_COLORS.text2, font:{size:12} }, grid:{display:false} }
      }
    }
  });
}

// ---------- Chart 3: Distribusi ROI 45 hari (histogram bucket) ----------
function renderRoiDistChart(){
  const canvas=document.getElementById('chartRoiDist');
  if(!canvas)return;
  destroyChart('roiDist');
  const withRoi=allData.filter(r=>r.roi45>0);
  if(!withRoi.length)return;

  const buckets=[
    { label:'0-1x', min:0, max:1, color:CHART_COLORS.red },
    { label:'1-2x', min:1, max:2, color:CHART_COLORS.amber },
    { label:'2-3x', min:2, max:3, color:CHART_COLORS.accent },
    { label:'3-5x', min:3, max:5, color:CHART_COLORS.accent2 },
    { label:'5x+',  min:5, max:Infinity, color:CHART_COLORS.green }
  ];
  const counts=buckets.map(b=>withRoi.filter(r=>r.roi45>=b.min && r.roi45<b.max).length);

  const ctx=canvas.getContext('2d');
  chartInstances.roiDist=new Chart(ctx,{
    type:'bar',
    data:{
      labels:buckets.map(b=>b.label),
      datasets:[{ data:counts, backgroundColor:buckets.map(b=>b.color), borderRadius:6, maxBarThickness:50 }]
    },
    options:baseChartOptions({
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:ctx=>`${ctx.parsed.y} kreator` } } },
      scales:{ x:{ ticks:{ color:CHART_COLORS.text2, font:{size:11} }, grid:{display:false} },
               y:{ ticks:{ color:CHART_COLORS.text2, font:{size:10}, stepSize:1 }, grid:{ color:CHART_COLORS.grid }, beginAtZero:true } }
    })
  });
}

// ---------- Chart 4: Top 10 ROI tertinggi (paling efisien, bukan cuma GMV gede) ----------
function renderTopRoiChart(){
  const canvas=document.getElementById('chartTopRoi');
  if(!canvas)return;
  destroyChart('topRoi');
  const top=[...allData].filter(r=>r.roi45>0).sort((a,b)=>b.roi45-a.roi45).slice(0,10);
  if(!top.length)return;

  const ctx=canvas.getContext('2d');
  chartInstances.topRoi=new Chart(ctx,{
    type:'bar',
    data:{
      labels:top.map(r=>'@'+r.name),
      datasets:[{ label:'ROI 45h', data:top.map(r=>r.roi45), backgroundColor:CHART_COLORS.purple, borderRadius:5, maxBarThickness:24 }]
    },
    options:{
      indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:ctx=>`ROI ${ctx.parsed.x.toFixed(1)}x · GMV ${fmtRp(top[ctx.dataIndex].gmv)}` } } },
      scales:{
        x:{ ticks:{ color:CHART_COLORS.text2, font:{size:10}, callback:v=>v+'x' }, grid:{ color:CHART_COLORS.grid }, beginAtZero:true },
        y:{ ticks:{ color:CHART_COLORS.text2, font:{size:10} }, grid:{display:false} }
      }
    }
  });
}
