// ============ APP INIT ============
// File ini di-load terakhir — pasang semua event listener DOM lalu jalankan checkAuth().
function applyTheme(theme){
  const selected=theme||'dark';
  document.body.setAttribute('data-theme', selected);
  localStorage.setItem('aa_theme', selected);
  const label=document.getElementById('themeLabel');
  if(label) label.textContent=selected==='light'?'Mode Cerah':'Mode Gelap';
}
function toggleTheme(){
  const next=document.body.getAttribute('data-theme')==='light'?'dark':'light';
  applyTheme(next);
}
applyTheme(localStorage.getItem('aa_theme')||'dark');
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{currentTab=btn.dataset.tab;pages.kreator=1;document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b===btn));renderKreatorTable();});
});
const dz=document.getElementById('dropzone'),fi=document.getElementById('fileInput');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag');});
dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');processFiles([...e.dataTransfer.files].filter(f=>f.name.match(/\.xlsx?$/i)));});
fi.addEventListener('change',()=>{if(fi.files.length)processFiles([...fi.files]);});

checkAuth();

// ============ FAVORITES (localStorage) ============
function toggleFavorite(name){
  const f=window.favorites||[];
  const idx=f.indexOf(name);
  if(idx===-1) f.push(name); else f.splice(idx,1);
  window.favorites=f;
  localStorage.setItem('aa_favs',JSON.stringify(f));
  renderKreatorTable();
}

// ============ REMINDER SCHEDULER ============
function scheduleReminders(){
  // run once per day if enabled in settings
  try{
    if(!settings.reminderEnabled) return;
    const last=localStorage.getItem('aa_last_reminder');
    const now=Date.now();
    if(last && (now - parseInt(last,10)) < 24*60*60*1000) return; // already ran today
    // call server endpoint to broadcast reminders (through router)
    fetch('/api/router?op=broadcast-reminders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({types:['pending','breakeven']} )}).then(r=>r.json()).then(()=>{
      localStorage.setItem('aa_last_reminder',String(now));
    }).catch(()=>{});
  }catch(e){}
}
// schedule at startup and every hour check
scheduleReminders();
setInterval(scheduleReminders,60*60*1000);
