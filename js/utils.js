// ============ UTILS ============
function parseRp(v){if(!v&&v!==0)return 0;if(typeof v==='number')return v;return parseInt(String(v).replace(/[^0-9]/g,''))||0;}
function fmtRp(v){if(!v)return 'Rp 0';if(v>=1000000000)return 'Rp '+(v/1000000000).toFixed(1)+'M';if(v>=1000000)return 'Rp '+(v/1000000).toFixed(1)+'jt';if(v>=1000)return 'Rp '+Math.round(v/1000)+'rb';return 'Rp '+Math.round(v);}
function fmtN(v){return Math.round(v||0).toLocaleString('id-ID');}
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
    perform:conv>=1?{icon:'✅',text:'Kirim sampel lagi. Konversi bagus & ROI positif.',a:'prioritas'}:{icon:'✅',text:'Perform dari GMV. Kirim lagi, minta aktif posting.',a:'prioritas'},
    boncos:{icon:'❌',text:'ROI < 1x. Stop kirim. Minta komitmen posting dulu.',a:'stop'},
    breakeven:r.videoSampel>=3?{icon:'🔄',text:'Break-even. Coba 1 sampel lagi.',a:'coba'}:{icon:'🔄',text:'Break-even. Evaluasi dulu sebelum kirim baru.',a:'evaluasi'},
    pending:r.sampelTerkirim>=3?{icon:'⛔',text:`Dapat ${r.sampelTerkirim} sampel, 0 video. Blacklist.`,a:'blacklist'}:{icon:'⏳',text:`Dapat ${r.sampelTerkirim} sampel, belum posting. Tunggu 14 hari.`,a:'tunggu'},
    potential:r.gmv>=500000?{icon:'🎯',text:`GMV ${fmtRp(r.gmv)} organic. Prioritas utama.`,a:'prioritas'}:{icon:'🔵',text:'Ada GMV organic. Worth to try 1 sampel.',a:'coba'},
    requested:{icon:'📋',text:`Minta ${r.sampelDiminta}x, belum dikirim. Review profil dulu.`,a:'review'},
    nodata:{icon:'⏸',text:'Belum ada aktivitas. Skip dulu.',a:'skip'}
  };
  return m[st]||m.nodata;
}
function getBadge(st){
  const m={perform:['b-perform','Perform'],boncos:['b-boncos','Boncos'],breakeven:['b-breakeven','Break-even'],potential:['b-potential','Potensi'],pending:['b-pending','Blm Post'],requested:['b-nodata','Minta Sampel'],nodata:['b-nodata','—']};
  return m[st]||['b-nodata','—'];
}
