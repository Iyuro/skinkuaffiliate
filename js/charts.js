// ============ GRAFIK (Chart.js) ============
// 3 grafik di Dashboard:
// 1. Bar chart Top 10 GMV per kreator
// 2. Bar chart Sampel Diminta vs Terkirim vs Video per kreator (top 10 by sampel terkirim)
// 3. Line chart trend per file upload (GMV, Video, Sampel Diminta dari waktu ke waktu)
//
// Data buat chart #3 diambil dari `rawRows` (creator_rows mentah per file upload, lihat
// js/state.js & js/api-client.js), supaya "traffic" tiap file/waktu kelihatan bedanya —
// bukan dari `allData` yang sudah di-merge jadi satu angka final per kreator.

let chartInstances = { gmv: null, sampleVsVideo: null, trend: null };

const CHART_COLORS = {
  accent: '#818cf8', accent2: '#6366f1', green: '#22c55e', amber: '#f59e0b',
  red: '#ef4444', purple: '#a855f7', text2: '#9090aa', grid: 'rgba(255,255,255,0.06)'
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
  renderGmvChart();
  renderSampleVsVideoChart();
  renderTrendChart();
}

// ---------- Chart 1: Top 10 GMV per kreator ----------
function renderGmvChart(){
  const canvas=document.getElementById('chartGmvPerCreator');
  if(!canvas)return;
  destroyChart('gmv');
  const top=[...allData].sort((a,b)=>b.gmv-a.gmv).slice(0,10);
  if(!top.length)return;
  chartInstances.gmv=new Chart(canvas,{
    type:'bar',
    data:{
      labels:top.map(r=>'@'+r.name),
      datasets:[{ label:'GMV', data:top.map(r=>r.gmv), backgroundColor:CHART_COLORS.accent, borderRadius:5, maxBarThickness:28 }]
    },
    options:baseChartOptions({
      plugins:{ legend:{display:false}, tooltip:{ callbacks:{ label:ctx=>fmtRp(ctx.parsed.y) } } },
      scales:{ x:{ ticks:{ color:CHART_COLORS.text2, font:{size:10}, maxRotation:45, minRotation:45 }, grid:{display:false} },
               y:{ ticks:{ color:CHART_COLORS.text2, font:{size:10}, callback:v=>fmtRp(v) }, grid:{ color:CHART_COLORS.grid }, beginAtZero:true } }
    })
  });
}

// ---------- Chart 2: Sampel Diminta vs Terkirim vs Video, top 10 by sampel terkirim ----------
function renderSampleVsVideoChart(){
  const canvas=document.getElementById('chartSampleVsVideo');
  if(!canvas)return;
  destroyChart('sampleVsVideo');
  const top=[...allData].filter(r=>r.sampelTerkirim>0||r.sampelDiminta>0).sort((a,b)=>b.sampelTerkirim-a.sampelTerkirim).slice(0,10);
  if(!top.length)return;
  chartInstances.sampleVsVideo=new Chart(canvas,{
    type:'bar',
    data:{
      labels:top.map(r=>'@'+r.name),
      datasets:[
        { label:'Diminta', data:top.map(r=>r.sampelDiminta), backgroundColor:CHART_COLORS.amber, borderRadius:4, maxBarThickness:18 },
        { label:'Terkirim', data:top.map(r=>r.sampelTerkirim), backgroundColor:CHART_COLORS.accent2, borderRadius:4, maxBarThickness:18 },
        { label:'Video', data:top.map(r=>r.videoSampel), backgroundColor:CHART_COLORS.green, borderRadius:4, maxBarThickness:18 }
      ]
    },
    options:baseChartOptions({
      scales:{ x:{ ticks:{ color:CHART_COLORS.text2, font:{size:10}, maxRotation:45, minRotation:45 }, grid:{display:false} },
               y:{ ticks:{ color:CHART_COLORS.text2, font:{size:10} }, grid:{ color:CHART_COLORS.grid }, beginAtZero:true } }
    })
  });
}

// ---------- Chart 3: Trend per file upload (urut waktu) ----------
// Agregat semua creator_rows per file_id, diurutkan by uploaded_at — jadi kelihatan
// "traffic" total (GMV/Video/Sampel) naik-turun dari upload ke upload (dari waktu ke waktu).
function renderTrendChart(){
  const canvas=document.getElementById('chartTrend');
  const emptyEl=document.getElementById('chartTrendEmpty');
  if(!canvas)return;
  destroyChart('trend');

  const byFile={};
  rawRows.forEach(r=>{
    if(!r.file_id)return;
    if(!byFile[r.file_id])byFile[r.file_id]={gmv:0,video:0,sampelDiminta:0,sampelTerkirim:0};
    byFile[r.file_id].gmv+=r.gmv||0;
    byFile[r.file_id].video+=r.videoSampel||0;
    byFile[r.file_id].sampelDiminta+=r.sampelDiminta||0;
    byFile[r.file_id].sampelTerkirim+=r.sampelTerkirim||0;
  });
  const points=loadedFiles
    .filter(f=>byFile[f.id])
    .map(f=>({ label:f.name.length>16?f.name.slice(0,14)+'…':f.name, uploadedAt:f.uploadedAt, ...byFile[f.id] }))
    .sort((a,b)=>new Date(a.uploadedAt)-new Date(b.uploadedAt));

  if(points.length===0){
    canvas.style.display='none';
    if(emptyEl)emptyEl.style.display='block';
    return;
  }
  canvas.style.display='block';
  if(emptyEl)emptyEl.style.display='none';

  chartInstances.trend=new Chart(canvas,{
    type:'line',
    data:{
      labels:points.map(p=>p.label),
      datasets:[
        { label:'GMV', data:points.map(p=>p.gmv), borderColor:CHART_COLORS.accent, backgroundColor:'rgba(129,140,248,0.15)', fill:true, tension:.3, yAxisID:'y' },
        { label:'Video', data:points.map(p=>p.video), borderColor:CHART_COLORS.green, backgroundColor:'rgba(34,197,94,0.1)', fill:false, tension:.3, yAxisID:'y1' },
        { label:'Sampel Diminta', data:points.map(p=>p.sampelDiminta), borderColor:CHART_COLORS.amber, backgroundColor:'rgba(245,158,11,0.1)', fill:false, tension:.3, yAxisID:'y1' }
      ]
    },
    options:baseChartOptions({
      interaction:{ mode:'index', intersect:false },
      scales:{
        x:{ ticks:{ color:CHART_COLORS.text2, font:{size:10} }, grid:{display:false} },
        y:{ position:'left', ticks:{ color:CHART_COLORS.text2, font:{size:10}, callback:v=>fmtRp(v) }, grid:{ color:CHART_COLORS.grid }, beginAtZero:true },
        y1:{ position:'right', ticks:{ color:CHART_COLORS.text2, font:{size:10} }, grid:{display:false}, beginAtZero:true }
      }
    })
  });
}
