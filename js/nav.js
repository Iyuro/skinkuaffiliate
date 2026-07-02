// ============ NAV ============
function switchView(view){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  document.querySelectorAll('.nav-item[id]').forEach(n=>n.classList.remove('active'));
  const navEl=document.getElementById('nav-'+view);if(navEl)navEl.classList.add('active');
  const titles={upload:'Upload Data',dashboard:'Dashboard',kreator:'Kreator List',exclusive:'Affiliate Exclusive',rank:'🏆 Rank Kreator',ai:'AI Analyst',settings:'Settings'};
  document.getElementById('topbarTitle').textContent=titles[view]||view;
  if(view==='kreator'&&allData.length)renderKreatorTable();
  if(view==='dashboard'&&allData.length){
    renderKPIGrid();
    renderDashboard();
    // requestAnimationFrame memastikan browser sudah selesai layout view-dashboard
    // sebelum Chart.js mencoba kalkulasi dimensi canvas. Tanpa ini chart bisa render
    // saat container masih display:none (width=0) dan hasilnya kosong.
    requestAnimationFrame(()=>requestAnimationFrame(()=>renderCharts()));
  }
  if(view==='rank'&&allData.length)renderRankView();
  if(view==='settings'&&typeof loadActivityLog==='function')loadActivityLog();
  apiLogActivity('page_view', titles[view]||view);
}
function updateDataInfo(){document.getElementById('dataInfo').textContent=allData.length?`${allData.length} kreator loaded`:'Belum ada data';}
// "Reset" di topbar sekarang artinya sync ulang dari server (bukan hapus data),
// karena data tersimpan permanen di Supabase. Untuk hapus data, pakai tombol 🗑
// di masing-masing file pada daftar "File ter-upload" (lihat js/dashboard.js renderFileChips).
async function clearData(){
  if(!confirm('Sync ulang data dari server? (Data yang sudah tersimpan TIDAK akan terhapus)'))return;
  apiLogActivity('resync_data', null);
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
