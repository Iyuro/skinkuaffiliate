// ============ KREATOR LIST (tabel utama) ============
// Kolom "Kreator" di tabel ini langsung ngelink ke profil TikTok kreator
// via renderCreatorLink() dari js/tiktok.js — klik nama = buka tab baru ke tiktok.com/@username.
function renderKreatorTable(){
  if(!allData.length){document.getElementById('kreatorEmpty').style.display='block';document.getElementById('kreatorContent').style.display='none';return;}
  document.getElementById('kreatorEmpty').style.display='none';document.getElementById('kreatorContent').style.display='block';
  const q=document.getElementById('searchInput').value.toLowerCase(),sortVal=document.getElementById('sortSelect').value;
  const cv=r=>r.sampelTerkirim>0?r.videoSampel/r.sampelTerkirim:-1;
  let data=allData.filter(r=>{
    if(q&&!r.name.toLowerCase().includes(q))return false;
    const st=getStatus(r);
    if(currentTab==='perform')return st==='perform'||st==='breakeven';
    if(currentTab==='boncos')return st==='boncos';
    if(currentTab==='potential')return st==='potential';
    if(currentTab==='pending')return st==='pending';
    if(currentTab==='organic')return st==='potential'&&r.sampelTerkirim===0;
    return true;
  });
  data.sort((a,b)=>{
    if(sortVal==='gmv_desc')return b.gmv-a.gmv;if(sortVal==='gmv_asc')return a.gmv-b.gmv;
    if(sortVal==='roi_desc')return b.roi45-a.roi45;if(sortVal==='video_desc')return b.videoSampel-a.videoSampel;
    if(sortVal==='sample_desc')return b.sampelTerkirim-a.sampelTerkirim;if(sortVal==='conv_desc')return cv(b)-cv(a);
    return b.gmv-a.gmv;
  });
  const total=data.length,p=pages.kreator,start=(p-1)*PAGE_SIZE,slice=data.slice(start,start+PAGE_SIZE);
  const maxGMV=Math.max(...allData.map(r=>r.gmv),1);
  document.getElementById('kreatorCount').textContent=`${total} kreator`;
  document.getElementById('kreatorPageInfo').textContent=`${start+1}–${Math.min(start+PAGE_SIZE,total)} dari ${total}`;
  const pb=document.querySelectorAll('#view-kreator .pager button');
  if(pb[0])pb[0].disabled=p===1;if(pb[1])pb[1].disabled=start+PAGE_SIZE>=total;
  const tbody=document.getElementById('kreatorBody'),e2=document.getElementById('kreatorEmpty2');
  if(!slice.length){tbody.innerHTML='';e2.style.display='block';return;}
  e2.style.display='none';
  const sc={prioritas:'#4ade80',coba:'#818cf8',evaluasi:'#fbbf24',stop:'#f87171',blacklist:'#f87171',tunggu:'#fbbf24',review:'#94a3b8',skip:'#444'};
  tbody.innerHTML=slice.map(r=>{
    const st=getStatus(r),[bc,bl]=getBadge(st),saran=getSaran(r);
    const cvv=r.sampelTerkirim>0?r.videoSampel/r.sampelTerkirim:null;
    const cvStr=cvv!==null?(cvv*100).toFixed(0)+'%':'—';
    const cvCls=cvv===null?'':cvv>=1?'conv-ok':cvv>=0.5?'conv-mid':'conv-bad';
    const bw=Math.max(3,Math.round((r.gmv/maxGMV)*55));
    const bc2=st==='boncos'?'#ef4444':st==='perform'?'#22c55e':st==='potential'?'#6366f1':'#333';
    const rc=r.roi45>=settings.roiPerform?'var(--green)':r.roi45>=1?'var(--amber)':r.roi45>0?'var(--red)':'var(--text3)';
    const isGhost=r.sampelTerkirim>0&&r.videoSampel===0&&r.gmv===0;
    return `<tr class="${isGhost?'ghost-row':''}">
      <td>${renderCreatorLink(r.name)}</td>
      <td><span class="badge ${bc}">${bl}</span></td>
      <td style="text-align:center">${r.sampelDiminta>0?`<b>${r.sampelDiminta}</b>`:'<span style="color:var(--text3)">0</span>'}</td>
      <td style="text-align:center">${r.sampelTerkirim>0?`<b>${r.sampelTerkirim}</b>`:'<span style="color:var(--text3)">0</span>'}</td>
      <td style="text-align:center">${r.videoSampel>0?`<b style="color:var(--green)">${r.videoSampel}</b>`:r.sampelTerkirim>0?'<b style="color:var(--red)">0</b>':'<span style="color:var(--text3)">0</span>'}</td>
      <td style="text-align:center">${r.liveSampel>0?r.liveSampel:'<span style="color:var(--text3)">0</span>'}</td>
      <td style="text-align:center"><span class="${cvCls}">${cvStr}</span></td>
      <td><div style="margin-bottom:2px"><span class="mini-bar" style="width:${bw}px;background:${bc2}"></span></div><span style="font-size:11.5px">${fmtRp(r.gmv)}</span></td>
      <td style="text-align:center;font-weight:700;color:${rc}">${r.roi45>0?r.roi45.toFixed(1)+'x':'—'}</td>
      <td style="text-align:center">${r.orders>0?fmtN(r.orders):'<span style="color:var(--text3)">—</span>'}</td>
      <td class="saran-text"><span style="color:${sc[saran.a]||'#666'}">${saran.icon} ${saran.text}</span></td>
    </tr>`;
  }).join('');
}
