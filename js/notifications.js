// ============ NOTIFICATIONS ============
// 1. Badge alert merah di nav "Dashboard" — jumlah ghost kreator + kontrak VIP/Kontrak
//    yang mau/sudah expire (≤7 hari). Sinkron secara visual dengan apa yang bot Telegram kasih tau.
// 2. Toast notification kecil di pojok — feedback yang lebih hidup daripada alert() browser.

function updateAlertBadge(){
  const badge=document.getElementById('dashboardAlertBadge');
  if(!badge)return;
  const ghostCount=allData.filter(r=>r.sampelTerkirim>0&&r.videoSampel===0&&r.gmv===0).length;
  const now=new Date(),in7d=new Date(now.getTime()+7*24*60*60*1000);
  const expiringCount=exclusiveData.filter(e=>e.expire&&new Date(e.expire)<=in7d).length;
  const total=ghostCount+expiringCount;
  badge.textContent=total>9?'9+':total;
  badge.style.display=total>0?'inline':'none';
}

// toast('Berhasil disimpan', 'success') / toast('Gagal hapus file', 'error') / toast('...', 'info')
function toast(message, type){
  type=type||'info';
  let container=document.getElementById('toastContainer');
  if(!container){
    container=document.createElement('div');
    container.id='toastContainer';
    container.className='toast-container';
    document.body.appendChild(container);
  }
  const icons={success:'✅',error:'⚠️',info:'ℹ️'};
  const el=document.createElement('div');
  el.className=`toast toast-${type}`;
  el.innerHTML=`<span class="toast-icon">${icons[type]||icons.info}</span><span class="toast-msg">${message}</span>`;
  container.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{
    el.classList.remove('show');
    setTimeout(()=>el.remove(),250);
  },3200);
}

// Animasi angka naik dari 0 ke nilai akhir, dipakai di KPI cards.
// Format function (fmtRp/fmtN) dipanggil di akhir animasi biar formatnya tetap rapi.
function animateNumber(el, endValue, formatFn, duration){
  if(!el)return;
  duration=duration||600;
  const startValue=0;
  const startTime=performance.now();
  function tick(now){
    const progress=Math.min((now-startTime)/duration,1);
    const eased=1-Math.pow(1-progress,3); // ease-out cubic
    const current=startValue+(endValue-startValue)*eased;
    el.textContent=formatFn?formatFn(current):Math.round(current);
    if(progress<1)requestAnimationFrame(tick);
    else el.textContent=formatFn?formatFn(endValue):Math.round(endValue);
  }
  requestAnimationFrame(tick);
}
