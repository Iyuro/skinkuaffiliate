// ============ NAV ============
function switchView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  document.querySelectorAll('.nav-item[id]').forEach(n=>n.classList.remove('active'));
  const navEl=document.getElementById('nav-'+view);if(navEl)navEl.classList.add('active');
  const titles={upload:'Upload Data',dashboard:'Dashboard',rank:'Leaderboard',kreator:'Kreator List',exclusive:'Affiliate Exclusive',ai:'AI Analyst',settings:'Settings'};
  document.getElementById('topbarTitle').textContent=titles[view]||view;
  if(view==='kreator'&&allData.length)renderKreatorTable();
  if(view==='dashboard'&&allData.length){renderKPIGrid();renderDashboard();renderCharts();}
  if(view==='dashboard'&&allData.length){renderRankCard();}
  if(view==='rank'&&allData.length){renderRankPage();}
  if(view==='rank'){history.replaceState(null,'',window.location.pathname+'?rank=1');}
  else{history.replaceState(null,'',window.location.pathname);}
}

function renderRankCard(){
  const wrapper=document.getElementById('podiumPreview');
  const controls=document.getElementById('podiumControls');
  if(!wrapper||!controls) return;
  const top=[...allData].sort((a,b)=>b.gmv-a.gmv).slice(0,5);
  wrapper.className='podium-preview podium-style-'+rankPodiumStyle;
  wrapper.innerHTML = top.length ? `
    <div class="podium-top">${top.slice(0,3).map((r,i)=>`<div class="podium-step step-${i+1}">
      <div class="podium-rank">${i+1}</div>
      <div class="podium-creator">@${r.name}</div>
      <div class="podium-value">${fmtRp(r.gmv)}</div>
    </div>`).join('')}</div>
    <div class="podium-list">${top.slice(3).map((r,i)=>`<div class="podium-row"><span class="podium-index">#${i+4}</span><span>@${r.name}</span><span>${fmtRp(r.gmv)}</span></div>`).join('')}</div>
  ` : '<div class="empty-state" style="padding:18px">Belum ada data rank.</div>';

  const styleNames=['Biru','Gold','Gelap'];
  controls.innerHTML = styleNames.map((name,idx)=>`<button class="btn btn-ghost btn-sm ${rankPodiumStyle===idx+1?'active':''}" onclick="setRankStyle(${idx+1})">${name}</button>`).join(' ');
}

function renderRankPage(){
  const podium=document.getElementById('podiumBoard');
  const list=document.getElementById('rankList');
  if(!podium||!list) return;
  const top=[...allData].sort((a,b)=>b.gmv-a.gmv);
  podium.className='podium-board podium-style-'+rankPodiumStyle;
  podium.innerHTML = top.length ? `
    <div class="podium-big">
      ${top.slice(0,3).map((r,i)=>`<div class="podium-step step-${i+1}">
        <div class="step-label">${[appIcon('crown','lg'),appIcon('medal','lg'),appIcon('medal','lg')][i] || ''}</div>
        <div class="step-rank">@${r.name}</div>
        <div class="step-value">${fmtRp(r.gmv)}</div>
      </div>`).join('')}
    </div>
  ` : '<div class="empty-state" style="padding:28px">Belum ada rank untuk ditampilkan.</div>';
  list.innerHTML = top.length ? top.map((r,i)=>`<div class="rank-item"><span class="rank-index">#${i+1}</span><span class="rank-name">@${r.name}</span><span class="rank-gmv">${fmtRp(r.gmv)}</span></div>`).join('') : '';
}

function renderPublicRank(data){
  const podium=document.getElementById('publicPodium');
  const list=document.getElementById('publicRankBody');
  if(!podium||!list) return;
  const top=[...data].sort((a,b)=>b.gmv-a.gmv);
  podium.className='podium-board podium-style-1';
  podium.innerHTML = top.length ? `
    <div class="podium-big">
      ${top.slice(0,3).map((r,i)=>`<div class="podium-step step-${i+1}">
        <div class="step-label">${[appIcon('crown','lg'),appIcon('medal','lg'),appIcon('medal','lg')][i] || ''}</div>
        <div class="step-rank">@${r.name}</div>
        <div class="step-value">${fmtRp(r.gmv)} • ${r.videoSampel || 0} video</div>
      </div>`).join('')}
    </div>
  ` : '<div class="empty-state" style="padding:28px">Belum ada rank publik untuk ditampilkan.</div>';
  list.innerHTML = top.length ? top.map((r,i)=>`<div class="rank-item"><span class="rank-index">#${i+1}</span><span class="rank-name">@${r.name}</span><span class="rank-meta">${r.videoSampel || 0} video • ${fmtRp(r.gmv)}</span></div>`).join('') : '';
}

function setRankStyle(styleId){
  rankPodiumStyle = styleId;
  renderRankCard();
  renderRankPage();
}

function copyRankShareLink(){
  const url = new URL(window.location.href);
  url.searchParams.set('rank','1');
  const link = url.toString();
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(link).then(()=>toast('Link rank disalin ke clipboard','success')).catch(()=>toast('Gagal menyalin link rank','error'));
  } else {
    const temp = document.createElement('textarea');
    temp.value = link;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    temp.remove();
    toast('Link rank disalin ke clipboard','success');
  }
}
function updateDataInfo(){document.getElementById('dataInfo').textContent=allData.length?`${allData.length} kreator loaded`:'Belum ada data';}
// "Reset" di topbar sekarang artinya sync ulang dari server (bukan hapus data),
// karena data tersimpan permanen di Supabase. Untuk hapus data, pakai tombol hapus file di daftar upload.
// di masing-masing file pada daftar "File ter-upload" (lihat js/dashboard.js renderFileChips).
async function clearData(){
  if(!confirm('Sync ulang data dari server? (Data yang sudah tersimpan TIDAK akan terhapus)'))return;
  await loadAllDataFromServer();
  switchView('upload');
}

async function deleteFile(fileId,fileName){
  if(!confirm(`Hapus file "${fileName}"? Semua data kreator dari file ini akan terhapus permanen.`))return;
  try{
    await apiDeleteFile(fileId);
    await loadAllDataFromServer();
    toast(`File "${fileName}" dihapus`,'success');
  }catch(err){
    toast('Gagal hapus file: '+err.message,'error');
  }
}
function exportCSV(){
  if(!allData.length){toast('Tidak ada data untuk di-export','error');return;}
  const h=['Kreator','Status','Sampel Diminta','Sampel Terkirim','Video','LIVE','Konversi%','GMV','ROI 45h','Orders','Saran'];
  const rows=allData.map(r=>{const st=getStatus(r),s=getSaran(r),cv=r.sampelTerkirim>0?((r.videoSampel/r.sampelTerkirim)*100).toFixed(0)+'%':'-';return[r.name,st,r.sampelDiminta,r.sampelTerkirim,r.videoSampel,r.liveSampel,cv,r.gmv,r.roi45>0?r.roi45.toFixed(1)+'x':'-',r.orders,s.text];});
  const csv=[h,...rows].map(r=>r.map(v=>`"${v}"`).join(',')).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='affiliate_export.csv';a.click();
  toast('CSV berhasil di-export','success');
}
