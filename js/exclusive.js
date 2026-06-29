// ============ AFFILIATE EXCLUSIVE ("kolam kreator" VIP & Kontrak) ============
function toggleAddForm(){const f=document.getElementById('addForm');f.style.display=f.style.display==='none'?'block':'none';if(f.style.display==='block')clearForm();}
function clearForm(){['ef-username','ef-nama','ef-komisi','ef-followers','ef-notes','ef-edit-id'].forEach(id=>document.getElementById(id).value='');document.getElementById('ef-tipe').value='vip';document.getElementById('ef-platform').value='tiktok';document.getElementById('ef-tanggal').value='';document.getElementById('ef-expire').value='';efTags=[];renderEfTags();}
function addProdukTag(e){if(e.key!=='Enter')return;e.preventDefault();const val=e.target.value.trim();if(val&&!efTags.includes(val)){efTags.push(val);renderEfTags();}e.target.value='';}
function renderEfTags(){document.getElementById('ef-produk-tags').innerHTML=efTags.map((t,i)=>`<span class="tag">${t} <span class="tag-del" onclick="efTags.splice(${i},1);renderEfTags()">✕</span></span>`).join('');}
async function saveExclusive(){
  const username=document.getElementById('ef-username').value.trim().replace('@','');
  if(!username){toast('Username wajib diisi','error');return;}
  const editId=document.getElementById('ef-edit-id').value;
  const item={id:editId||undefined,username,nama:document.getElementById('ef-nama').value.trim(),tipe:document.getElementById('ef-tipe').value,komisi:document.getElementById('ef-komisi').value,platform:document.getElementById('ef-platform').value,followers:document.getElementById('ef-followers').value.trim(),tanggal:document.getElementById('ef-tanggal').value,expire:document.getElementById('ef-expire').value,produk:[...efTags],notes:document.getElementById('ef-notes').value.trim()};
  const saveBtn=document.querySelector('#addForm .btn-primary');
  if(saveBtn){saveBtn.disabled=true;saveBtn.textContent='Menyimpan...';}
  try{
    await apiSaveExclusive(item);
    const { items } = await apiGetExclusive();
    exclusiveData = items.map(dbExclusiveToApp);
    clearForm();document.getElementById('addForm').style.display='none';
    renderExclusiveList();updateExclusiveBadge();updateAlertBadge();
    toast(editId?'Kreator exclusive diupdate':'Kreator exclusive ditambahkan','success');
  }catch(err){
    toast('Gagal simpan: '+err.message,'error');
  }finally{
    if(saveBtn){saveBtn.disabled=false;saveBtn.innerHTML='💾 Simpan';}
  }
}
function editExclusive(id){
  const item=exclusiveData.find(x=>x.id===id);if(!item)return;
  document.getElementById('ef-username').value=item.username;document.getElementById('ef-nama').value=item.nama||'';
  document.getElementById('ef-tipe').value=item.tipe||'vip';document.getElementById('ef-komisi').value=item.komisi||'';
  document.getElementById('ef-platform').value=item.platform||'tiktok';document.getElementById('ef-followers').value=item.followers||'';
  document.getElementById('ef-tanggal').value=item.tanggal||'';document.getElementById('ef-expire').value=item.expire||'';
  document.getElementById('ef-notes').value=item.notes||'';document.getElementById('ef-edit-id').value=id;
  efTags=[...(item.produk||[])];renderEfTags();
  document.getElementById('addForm').style.display='block';document.getElementById('addForm').scrollIntoView({behavior:'smooth'});
}
async function deleteExclusive(id){
  if(!confirm('Hapus kreator exclusive ini?'))return;
  try{
    await apiDeleteExclusive(id);
    exclusiveData=exclusiveData.filter(x=>x.id!==id);
    renderExclusiveList();updateExclusiveBadge();updateAlertBadge();
    toast('Kreator exclusive dihapus','success');
  }catch(err){
    toast('Gagal hapus: '+err.message,'error');
  }
}

// Nama kreator di kartu "kolam" exclusive ini otomatis ngelink ke profil TikTok-nya
// (pakai username yang diisi di form — field ini memang diisi username TikTok).
function renderExclusiveList(){
  const el=document.getElementById('exclusiveList'),empty=document.getElementById('exclusiveEmpty');
  if(!exclusiveData.length){el.innerHTML='';empty.style.display='block';return;}
  empty.style.display='none';
  const tb={vip:'<span class="badge b-vip">⭐ VIP</span>',contract:'<span class="badge b-contract">📝 Kontrak</span>',both:'<span class="badge b-vip">⭐ VIP</span><span class="badge b-contract" style="margin-left:4px">📝 Kontrak</span>'};
  const pi={tiktok:'🎵',instagram:'📸',youtube:'▶️',multi:'🌐'};
  el.innerHTML=exclusiveData.map(item=>{
    const isExp=item.expire&&new Date(item.expire)<new Date();
    const expSoon=item.expire&&!isExp&&(new Date(item.expire)-new Date())<7*24*60*60*1000;
    const nameLink=renderCreatorLink(item.username,{extraClass:'excl-name-link'});
    return `<div class="excl-card">
      <div class="excl-header">
        <h3>${pi[item.platform]||'🎵'} ${nameLink} ${item.nama?`<span style="font-weight:400;color:var(--text3);font-size:12px">${item.nama}</span>`:''}</h3>
        <div style="display:flex;gap:6px;align-items:center">
          ${tb[item.tipe]||''}
          ${isExp?'<span class="badge b-boncos">Expired</span>':expSoon?'<span class="badge b-breakeven">Expire Soon</span>':''}
          <button class="btn btn-ghost btn-sm" onclick="editExclusive('${item.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteExclusive('${item.id}')">🗑</button>
        </div>
      </div>
      <div style="padding:14px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;font-size:13px">
        ${item.komisi?`<div><div style="font-size:10px;color:var(--text3);margin-bottom:2px;text-transform:uppercase;letter-spacing:.06em">Komisi</div><div style="font-weight:700;color:var(--gold);font-size:16px">${item.komisi}%</div></div>`:''}
        ${item.followers?`<div><div style="font-size:10px;color:var(--text3);margin-bottom:2px;text-transform:uppercase;letter-spacing:.06em">Followers</div><div>${item.followers}</div></div>`:''}
        ${item.tanggal?`<div><div style="font-size:10px;color:var(--text3);margin-bottom:2px;text-transform:uppercase;letter-spacing:.06em">Mulai</div><div>${item.tanggal}</div></div>`:''}
        ${item.expire?`<div><div style="font-size:10px;color:var(--text3);margin-bottom:2px;text-transform:uppercase;letter-spacing:.06em">Berakhir</div><div style="color:${isExp?'var(--red)':expSoon?'var(--amber)':'var(--text)'}">${item.expire}</div></div>`:''}
        ${item.produk&&item.produk.length?`<div style="grid-column:1/-1"><div style="font-size:10px;color:var(--text3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.06em">Produk</div><div class="tag-list">${item.produk.map(p=>`<span class="tag-item">${p}</span>`).join('')}</div></div>`:''}
        ${item.notes?`<div style="grid-column:1/-1"><div style="font-size:10px;color:var(--text3);margin-bottom:2px;text-transform:uppercase;letter-spacing:.06em">Notes</div><div style="color:var(--text2);font-size:12px;line-height:1.5">${item.notes}</div></div>`:''}
      </div>
    </div>`;
  }).join('');
}
function updateExclusiveBadge(){document.getElementById('exclusiveBadge').textContent=exclusiveData.length;}
