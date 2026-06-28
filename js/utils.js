// ============ UTILS ============
function parseRp(v){if(!v&&v!==0)return 0;if(typeof v==='number')return v;return parseInt(String(v).replace(/[^0-9]/g,''))||0;}
function fmtRp(v){if(!v)return 'Rp 0';if(v>=1000000000)return 'Rp '+(v/1000000000).toFixed(1)+'M';if(v>=1000000)return 'Rp '+(v/1000000).toFixed(1)+'jt';if(v>=1000)return 'Rp '+Math.round(v/1000)+'rb';return 'Rp '+Math.round(v);}
function fmtN(v){return Math.round(v||0).toLocaleString('id-ID');}
function appIcon(name, className=''){
  const icons={
    upload:'<svg viewBox="0 0 24 24"><path d="M12 3v10"/><path d="m7 8 5-5 5 5"/><path d="M5 14v4h14v-4"/></svg>',
    dashboard:'<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    creator:'<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    exclusive:'<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    ai:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M2 12h2M20 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/></svg>',
    export:'<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>',
    logout:'<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
    reset:'<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15-6.7"/><path d="M21 3v6h-6"/><path d="M21 12a9 9 0 0 1-15 6.7"/><path d="M3 21v-6h6"/></svg>',
    theme:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>',
    stop:'<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>',
    refresh:'<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
    clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
    list:'<svg viewBox="0 0 24 24"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/></svg>',
    pause:'<svg viewBox="0 0 24 24"><path d="M9 5v14"/><path d="M15 5v14"/></svg>',
    close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>',
    warn:'<svg viewBox="0 0 24 24"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 9v4"/><path d="M12 16h.01"/></svg>',
    info:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    send:'<svg viewBox="0 0 24 24"><path d="m3 12 18-9-4 18-4-6-10-3Z"/></svg>',
    crown:'<svg viewBox="0 0 24 24"><path d="m4 17 2-8 5 4 5-4 2 8z"/><path d="M6 17h12"/></svg>',
    medal:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="5"/><path d="M8.21 13.89 7 21l5-3 5 3-1.21-7.11"/></svg>',
    download:'<svg viewBox="0 0 24 24"><path d="M12 3v10"/><path d="m7 10 5 5 5-5"/><path d="M5 19h14"/></svg>'
  };
  return `<span class="app-icon ${className}">${icons[name]||icons.info}</span>`;
}
function detectType(h){const hl=h.map(x=>String(x||'').toLowerCase());if(hl.some(x=>x.includes('gmv dari kreator')||x.includes('pesanan teratribusi')))return 'transaction';if(hl.some(x=>x.includes('gmv konten')||x.includes('roi 45')))return 'sample';return 'unknown';}
function parseRows(data,type){
  if(type==='sample')return data.map(r=>({name:String(r['Creator name']||r['creator name']||'').trim(),sampelDiminta:parseInt(r['Sampel yang diminta']||0),sampelTerkirim:parseInt(r['Sampel terkirim']||0),videoSampel:parseInt(r['Video dengan sampel']||0),liveSampel:parseInt(r['Siaran LIVE dengan sampel']||0),gmv:parseRp(r['GMV Konten']||r['GMV konten']||0),roi45:parseFloat(r['ROI 45 hari']||0),roi90:parseFloat(r['ROI 90 hari']||0),orders:0,komisi:0,refund:0,aov:0,src:'sample'}));
  if(type==='transaction')return data.map(r=>({name:String(r['Creator name']||r['creator name']||'').trim(),sampelDiminta:0,sampelTerkirim:parseInt(r['Sampel terkirim']||0),videoSampel:parseInt(r['Video']||0),liveSampel:parseInt(r['Siaran LIVE']||0),gmv:parseRp(r['GMV dari kreator']||0),roi45:0,roi90:0,orders:parseInt(r['Pesanan teratribusi']||0),komisi:parseRp(r['Perkiraan komisi']||0),refund:parseRp(r['Pengembalian dana']||0),aov:parseRp(r['AOV']||0),src:'transaction'}));
  return [];
}
function mergeData(rows){
  const map={};
  rows.forEach(r=>{if(!r.name)return;if(!map[r.name]){map[r.name]={...r};return;}const e=map[r.name];['sampelDiminta','sampelTerkirim','videoSampel','liveSampel','gmv','roi45','roi90','orders','komisi','refund','aov'].forEach(k=>{e[k]=Math.max(e[k]||0,r[k]||0);});if(r.src==='transaction')e.src='transaction';});
  return Object.values(map);
}

// ============ STATUS ============
function getStatus(r){
  const{sampelTerkirim:k,sampelDiminta:d,videoSampel:v,gmv,roi45:roi}=r;
  if(k>0&&v===0&&gmv===0)return 'pending';
  if(roi>0){if(roi>=settings.roiPerform)return 'perform';if(roi>=1)return 'breakeven';return 'boncos';}
  if(k>0&&gmv>0){if(gmv>=500000)return 'perform';if(gmv>=100000)return 'breakeven';return 'boncos';}
  if(k===0&&gmv>0)return 'potential';
  if(d>0&&k===0)return 'requested';
  return 'nodata';
}
function getSaran(r){
  const st=getStatus(r),conv=r.sampelTerkirim>0?r.videoSampel/r.sampelTerkirim:0;
  const m={
    perform:conv>=1?{icon:appIcon('check','sm'),text:'Kirim sampel lagi. Konversi bagus & ROI positif.',a:'prioritas'}:{icon:appIcon('check','sm'),text:'Perform dari GMV. Kirim lagi, minta aktif posting.',a:'prioritas'},
    boncos:{icon:appIcon('stop','sm'),text:'ROI < 1x. Stop kirim. Minta komitmen posting dulu.',a:'stop'},
    breakeven:r.videoSampel>=3?{icon:appIcon('refresh','sm'),text:'Break-even. Coba 1 sampel lagi.',a:'coba'}:{icon:appIcon('refresh','sm'),text:'Break-even. Evaluasi dulu sebelum kirim baru.',a:'evaluasi'},
    pending:r.sampelTerkirim>=3?{icon:appIcon('pause','sm'),text:`Dapat ${r.sampelTerkirim} sampel, 0 video. Blacklist.`,a:'blacklist'}:{icon:appIcon('clock','sm'),text:`Dapat ${r.sampelTerkirim} sampel, belum posting. Tunggu 14 hari.`,a:'tunggu'},
    potential:r.gmv>=500000?{icon:appIcon('target','sm'),text:`GMV ${fmtRp(r.gmv)} organic. Prioritas utama.`,a:'prioritas'}:{icon:appIcon('target','sm'),text:'Ada GMV organic. Worth to try 1 sampel.',a:'coba'},
    requested:{icon:appIcon('list','sm'),text:`Minta ${r.sampelDiminta}x, belum dikirim. Review profil dulu.`,a:'review'},
    nodata:{icon:appIcon('pause','sm'),text:'Belum ada aktivitas. Skip dulu.',a:'skip'}
  };
  return m[st]||m.nodata;
}
function getBadge(st){
  const m={perform:['b-perform','Perform'],boncos:['b-boncos','Boncos'],breakeven:['b-breakeven','Break-even'],potential:['b-potential','Potensi'],pending:['b-pending','Blm Post'],requested:['b-nodata','Minta Sampel'],nodata:['b-nodata','—']};
  return m[st]||['b-nodata','—'];
}
