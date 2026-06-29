// ============ APP INIT ============
// File ini di-load terakhir — pasang semua event listener DOM lalu jalankan checkAuth().
applyTheme(document.documentElement.getAttribute('data-theme')||'dark'); // sync ikon tombol toggle (sudah diset di <head>, ini cuma update ikonnya)
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{currentTab=btn.dataset.tab;pages.kreator=1;document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b===btn));renderKreatorTable();});
});
const dz=document.getElementById('dropzone'),fi=document.getElementById('fileInput');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('drag');});
dz.addEventListener('dragleave',()=>dz.classList.remove('drag'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('drag');processFiles([...e.dataTransfer.files].filter(f=>f.name.match(/\.xlsx?$/i)));});
fi.addEventListener('change',()=>{if(fi.files.length)processFiles([...fi.files]);});

checkAuth();
