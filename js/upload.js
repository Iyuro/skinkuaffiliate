// ============ FILES (upload baru → Supabase) ============
function processFiles(files){
  files.forEach(f=>{
    const reader=new FileReader();
    reader.onload=async e=>{
      try{
        const wb=XLSX.read(e.target.result,{type:'array'});
        let totalParsed=0;
        for(const sn of wb.SheetNames){
          const raw=XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:''});
          if(!raw.length)continue;
          const type=detectType(Object.keys(raw[0]));
          const parsed=parseRows(raw,type).filter(r=>r.name);
          if(!parsed.length)continue;
          showUploadStatus(`Menyimpan ${f.name}...`);
          await apiSaveFile(f.name,type,parsed);
          totalParsed+=parsed.length;
        }
        showUploadStatus('');
        await loadAllDataFromServer();
        if(totalParsed>0)toast(`${f.name} berhasil disimpan (${totalParsed} kreator)`,'success');
        else toast(`${f.name} tidak punya data yang bisa dibaca`,'error');
      }catch(err){
        console.error(err);
        showUploadStatus('');
        toast('Gagal upload '+f.name+': '+err.message,'error');
      }
    };
    reader.readAsArrayBuffer(f);
  });
}

function showUploadStatus(text){
  const el=document.getElementById('uploadStatus');
  if(!el)return;
  el.textContent=text;
  el.style.display=text?'block':'none';
}

// ============ SYNC DARI SUPABASE ============
// Dipanggil saat app pertama kali dibuka (showApp) supaya data TIDAK hilang
// walau halaman di-refresh, pindah tab, atau dibuka dari device lain.
async function loadAllDataFromServer(){
  isSyncing=true;
  try{
    const { files, rows } = await apiGetFiles();
    loadedFiles = files.map(f=>({ id:f.id, name:f.file_name, type:f.file_type, count:f.row_count, uploadedAt:f.uploaded_at }));
    rawRows = rows.map(dbRowToAppRow);
    allData = mergeData(rawRows.map(r=>({...r}))); // merge tetap pakai logic lama (Math.max antar file)

    const { items } = await apiGetExclusive();
    exclusiveData = items.map(dbExclusiveToApp);
  }catch(err){
    console.error('Gagal sync dari server:',err);
    showSyncError(err.message);
  }finally{
    isSyncing=false;
  }
  renderAll();
  renderExclusiveList();
  updateExclusiveBadge();
  updateAlertBadge();
}

function showSyncError(msg){
  const el=document.getElementById('dataInfo');
  if(el)el.textContent='⚠️ Gagal sync: '+msg;
}

function renderAll(){
  renderFileChips();renderUploadKPI();renderKPIGrid();renderDashboard();renderKreatorTable();updateDataInfo();
  // requestAnimationFrame(x2) memastikan browser selesai layout sebelum Chart.js kalkulasi dimensi canvas.
  // Tanpa ini chart bisa render saat container belum visible (offsetWidth=0) dan hasilnya kosong.
  requestAnimationFrame(()=>requestAnimationFrame(()=>renderCharts()));
  updateAlertBadge();renderRankView();
  document.getElementById('kreatorBadge').style.display=allData.length?'inline':'none';
  document.getElementById('kreatorBadge').textContent=allData.length;
}
