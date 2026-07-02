// ─── File Chips dengan select & batch delete ──────────────────────────────────
let selectedFiles = new Set();

function renderFileChips(){
  const container = document.getElementById('fileChips');
  document.getElementById('uploadEmpty').style.display = loadedFiles.length ? 'none' : 'block';
  document.getElementById('uploadSummary').style.display = loadedFiles.length ? 'block' : 'none';
  const mgrSection = document.getElementById('fileMgrSection');
  if(mgrSection) mgrSection.style.display = loadedFiles.length ? 'block' : 'none';

  if(!loadedFiles.length){ container.innerHTML=''; return; }

  const allSelected = loadedFiles.length > 0 && selectedFiles.size === loadedFiles.length;

  container.innerHTML = `
    <div class="file-mgr">
      <div class="file-mgr-toolbar">
        <label class="file-select-all">
          <input type="checkbox" id="chkSelectAll" ${allSelected?'checked':''} onchange="toggleSelectAll(this.checked)">
          <span>${allSelected?'Batal pilih semua':'Pilih semua'} (${loadedFiles.length} file)</span>
        </label>
        <button class="btn btn-danger btn-sm" id="btnDeleteSelected"
          onclick="deleteSelectedFiles()"
          style="display:${selectedFiles.size>0?'inline-flex':'none'}">
          🗑 Hapus ${selectedFiles.size} file terpilih
        </button>
      </div>
      <div class="file-list">
        ${loadedFiles.map(f => `
          <div class="file-row ${selectedFiles.has(f.id)?'selected':''}" id="frow-${f.id}">
            <label class="file-row-check">
              <input type="checkbox" ${selectedFiles.has(f.id)?'checked':''}
                onchange="toggleSelectFile('${f.id}', this.checked)">
            </label>
            <div class="file-row-icon">📄</div>
            <div class="file-row-info">
              <div class="file-row-name">${escapeHtml(f.name)}</div>
              <div class="file-row-meta">${f.count} kreator · ${f.type==='transaction'?'Transaction':'Sample'} · ${formatFileDate(f.uploadedAt)}</div>
            </div>
            <button class="file-row-del" title="Hapus file ini"
              onclick="deleteFile('${f.id}','${escapeHtml(f.name).replace(/'/g,"\\'")}')">✕</button>
          </div>`).join('')}
      </div>
    </div>`;
}

function formatFileDate(ts){
  if(!ts) return '';
  try{
    const d = new Date(ts);
    return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});
  }catch(e){ return ''; }
}

function toggleSelectAll(checked){
  selectedFiles = checked ? new Set(loadedFiles.map(f=>f.id)) : new Set();
  renderFileChips();
}

function toggleSelectFile(id, checked){
  checked ? selectedFiles.add(id) : selectedFiles.delete(id);
  renderFileChips();
}

async function deleteSelectedFiles(){
  if(!selectedFiles.size) return;
  const count = selectedFiles.size;
  if(!confirm(`Hapus ${count} file terpilih? Semua data kreator dari file ini akan terhapus permanen.`)) return;

  const ids = [...selectedFiles];
  selectedFiles.clear();

  let failed = 0;
  for(const id of ids){
    try{ await apiDeleteFile(id); }
    catch(e){ failed++; console.error('Gagal hapus file',id,e); }
  }

  await loadAllDataFromServer();
  if(failed) toast(`${count-failed} file dihapus, ${failed} gagal`,'error');
  else toast(`${count} file berhasil dihapus`,'success');
}

function renderUploadKPI(){
  const d=allData,tGMV=d.reduce((a,r)=>a+r.gmv,0),tK=d.reduce((a,r)=>a+r.sampelTerkirim,0),tV=d.reduce((a,r)=>a+r.videoSampel,0),perf=d.filter(r=>getStatus(r)==='perform').length;
  document.getElementById('uploadKPI').innerHTML=`
    <div class="kpi-card accent"><div class="kpi-label">Total Kreator</div><div class="kpi-value">${fmtN(d.length)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total GMV</div><div class="kpi-value" style="color:var(--accent3)">${fmtRp(tGMV)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Sampel Terkirim</div><div class="kpi-value">${fmtN(tK)}<span style="font-size:13px;font-weight:400;color:var(--text3)"> pcs</span></div></div>
    <div class="kpi-card"><div class="kpi-label">Video Diposting</div><div class="kpi-value" style="color:var(--green)">${fmtN(tV)}</div></div>
    <div class="kpi-card"><div class="kpi-label">🔥 Perform</div><div class="kpi-value" style="color:var(--green)">${perf}</div></div>`;
}

function renderKPIGrid(){
  if(!allData.length){document.getElementById('dashEmpty').style.display='block';document.getElementById('dashContent').style.display='none';return;}
  document.getElementById('dashEmpty').style.display='none';document.getElementById('dashContent').style.display='block';
  const d=allData,tGMV=d.reduce((a,r)=>a+r.gmv,0),tK=d.reduce((a,r)=>a+r.sampelTerkirim,0),tD=d.reduce((a,r)=>a+r.sampelDiminta,0),tV=d.reduce((a,r)=>a+r.videoSampel,0),tL=d.reduce((a,r)=>a+r.liveSampel,0);
  const konv=tK>0?((tV/tK)*100).toFixed(0):0;
  const ghost=d.filter(r=>r.sampelTerkirim>0&&r.videoSampel===0&&r.gmv===0).length;
  const sm={};d.forEach(r=>{const s=getStatus(r);sm[s]=(sm[s]||0)+1;});
  const kc=konv>=50?'var(--green)':konv>=20?'var(--amber)':'var(--red)';
  document.getElementById('kpiGrid').innerHTML=`
    <div class="kpi-card accent"><div class="kpi-label">Total GMV</div><div class="kpi-value" id="kpiGmv" style="color:var(--accent3)">Rp 0</div></div>
    <div class="kpi-card"><div class="kpi-label">Sampel Diminta</div><div class="kpi-value" id="kpiDiminta">0</div><div class="kpi-sub">${d.filter(r=>r.sampelDiminta>0).length} kreator</div></div>
    <div class="kpi-card"><div class="kpi-label">Sampel Terkirim</div><div class="kpi-value" id="kpiTerkirim">0</div><div class="kpi-sub">${d.filter(r=>r.sampelTerkirim>0).length} kreator</div></div>
    <div class="kpi-card"><div class="kpi-label">Video dari Sampel</div><div class="kpi-value" id="kpiVideo" style="color:var(--green)">0</div><div class="kpi-sub">+ ${fmtN(tL)} LIVE</div></div>
    <div class="kpi-card"><div class="kpi-label">Konversi Sampel→Video</div><div class="kpi-value" id="kpiKonv" style="color:${kc}">0%</div></div>
    <div class="kpi-card"><div class="kpi-label">🔥 Perform</div><div class="kpi-value" id="kpiPerform" style="color:var(--green)">0</div></div>
    <div class="kpi-card"><div class="kpi-label">❌ Boncos</div><div class="kpi-value" id="kpiBoncos" style="color:var(--red)">0</div></div>
    <div class="kpi-card"><div class="kpi-label">👻 Ghost</div><div class="kpi-value" id="kpiGhost" style="color:var(--amber)">0</div><div class="kpi-sub">0 video dari sampel</div></div>`;
  // Angka naik dari 0 ke nilai asli — bikin dashboard kerasa lebih "hidup" tiap kali data berubah.
  animateNumber(document.getElementById('kpiGmv'),tGMV,fmtRp);
  animateNumber(document.getElementById('kpiDiminta'),tD,fmtN);
  animateNumber(document.getElementById('kpiTerkirim'),tK,fmtN);
  animateNumber(document.getElementById('kpiVideo'),tV,fmtN);
  animateNumber(document.getElementById('kpiKonv'),parseFloat(konv),v=>Math.round(v)+'%');
  animateNumber(document.getElementById('kpiPerform'),sm.perform||0,fmtN);
  animateNumber(document.getElementById('kpiBoncos'),sm.boncos||0,fmtN);
  animateNumber(document.getElementById('kpiGhost'),ghost,fmtN);
}

// ============ DASHBOARD MINI-TABLES (Top Perform / Ghost / Rekomendasi) ============
// Nama kreator di 3 tabel ini otomatis jadi link ke profil TikTok-nya (lihat js/tiktok.js).
let dashData={perform:[],ghost:[],rekomen:[]};

// Satu fungsi row-render dipakai bareng oleh renderDashboard() & changePage(),
// supaya link TikTok tidak perlu diduplikasi di banyak tempat.
const dashRowFns={
  perform:r=>`<td>${renderCreatorLink(r.name)}</td><td style="color:var(--green)">${fmtRp(r.gmv)}</td><td style="color:var(--text3)">ROI ${r.roi45>0?r.roi45.toFixed(1)+'x':'—'}</td><td style="color:var(--text3)">${r.videoSampel} video</td>`,
  ghost:r=>`<td>${renderCreatorLink(r.name)}</td><td style="color:var(--amber)">${r.sampelTerkirim} pcs</td><td style="color:var(--red);font-weight:700">0 video</td>`,
  rekomen:r=>`<td>${renderCreatorLink(r.name)}</td><td style="color:var(--accent3)">${fmtRp(r.gmv)}</td><td style="color:var(--text3);font-size:12px">Worth to try</td>`
};

function renderDashboard(){
  if(!allData.length)return;
  dashData.perform=[...allData].filter(r=>getStatus(r)==='perform').sort((a,b)=>b.gmv-a.gmv);
  dashData.ghost=allData.filter(r=>r.sampelTerkirim>0&&r.videoSampel===0&&r.gmv===0);
  dashData.rekomen=allData.filter(r=>getStatus(r)==='potential').sort((a,b)=>b.gmv-a.gmv);
  renderDashTable('perform','topPerformBody','performPager','performPageInfo',dashRowFns.perform);
  renderDashTable('ghost','ghostBody','ghostPager','ghostPageInfo',dashRowFns.ghost);
  renderDashTable('rekomen','rekomenBody','rekomenPager','rekomenPageInfo',dashRowFns.rekomen);
}

function renderDashTable(key,bodyId,pagerId,infoId,rowFn){
  const data=dashData[key],p=pages[key],total=data.length,start=(p-1)*DASH_SIZE,slice=data.slice(start,start+DASH_SIZE);
  const body=document.getElementById(bodyId);
  if(!slice.length){body.innerHTML=`<tr><td colspan="4" style="text-align:center;color:var(--text3);padding:20px">${key==='ghost'?'✅ Tidak ada ghost kreator!':key==='rekomen'?'Belum ada rekomendasi':'Belum ada data perform'}</td></tr>`;document.getElementById(pagerId).style.display='none';return;}
  body.innerHTML=slice.map(r=>`<tr>${rowFn(r)}</tr>`).join('');
  if(total>DASH_SIZE){
    document.getElementById(pagerId).style.display='flex';
    document.getElementById(infoId).textContent=`${start+1}–${Math.min(start+DASH_SIZE,total)} dari ${total}`;
    document.getElementById(pagerId).querySelectorAll('button')[0].disabled=p===1;
    document.getElementById(pagerId).querySelectorAll('button')[1].disabled=start+DASH_SIZE>=total;
  }else document.getElementById(pagerId).style.display='none';
}

function changePage(key,dir){
  pages[key]=Math.max(1,pages[key]+dir);
  if(key==='kreator')renderKreatorTable();
  else{
    const cfg={perform:['topPerformBody','performPager','performPageInfo',dashRowFns.perform],ghost:['ghostBody','ghostPager','ghostPageInfo',dashRowFns.ghost],rekomen:['rekomenBody','rekomenPager','rekomenPageInfo',dashRowFns.rekomen]};
    const[b,p,i,fn]=cfg[key];renderDashTable(key,b,p,i,fn);
  }
}

function showMorePerform(){switchView('kreator');currentTab='perform';document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab==='perform'));renderKreatorTable();}
function showMoreGhost(){switchView('kreator');currentTab='pending';document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab==='pending'));renderKreatorTable();}
function showMorePotential(){switchView('kreator');currentTab='potential';document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab==='potential'));renderKreatorTable();}
