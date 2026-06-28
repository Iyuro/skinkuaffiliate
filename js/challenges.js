// Admin UI for Challenges
async function loadChallenges(){
  try{
    const res = await fetch('/api/router?op=list-challenges',{headers:{'Authorization':localStorage.getItem('aa_auth')?('Bearer '+localStorage.getItem('aa_auth')):''}});
    const j = await res.json();
    const el = document.getElementById('challengesList');
    if(!j.ok){ el.innerHTML = '<div class="empty-state"><p>Tidak bisa load challenges</p></div>'; return; }
    const items = j.challenges||[];
    if(!items.length) { el.innerHTML = '<div class="empty-state"><p>Belum ada challenge</p></div>'; return; }
    el.innerHTML = items.map(c=>{
      const share = window.location.origin + '/challenge.html?id=' + encodeURIComponent(c.id);
      return `<div class="card" style="padding:12px;margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>${c.title}</strong><div style="font-size:13px;color:var(--text3)">${c.description||''}</div></div>
          <div style="text-align:right"><a class="btn btn-ghost btn-sm" href="${share}" target="_blank">Share</a> <button class="btn btn-sm" onclick="showSubmissions('${c.id}')">Submissions</button></div>
        </div>
      </div>`;
    }).join('');
  }catch(e){ console.error(e); }
}

function showCreateChallenge(){ document.getElementById('challengesCreate').style.display='block'; }
function hideCreateChallenge(){ document.getElementById('challengesCreate').style.display='none'; }

async function createChallenge(){
  const payload={ title:document.getElementById('ch-title').value, description:document.getElementById('ch-desc').value, reward:document.getElementById('ch-reward').value, google_form_url:document.getElementById('ch-gform').value||null, webhook_url:document.getElementById('ch-webhook').value||null };
  const res = await fetch('/api/router?op=create-challenge',{method:'POST',headers:{'Content-Type':'application/json','Authorization':localStorage.getItem('aa_auth')?('Bearer '+localStorage.getItem('aa_auth')):''},body:JSON.stringify(payload)});
  const j = await res.json();
  if(j.ok){ hideCreateChallenge(); loadChallenges(); }
  else alert('Gagal: '+(j.error||''));
}

async function showSubmissions(challengeId){
  const res = await fetch('/api/router?op=get-challenge&id='+encodeURIComponent(challengeId));
  const j = await res.json();
  if(!j.ok){ alert('Tidak ditemukan'); return; }
  const sup = await fetch('/api/router?op=list-submissions&id='+encodeURIComponent(challengeId),{headers:{'Authorization':localStorage.getItem('aa_auth')?('Bearer '+localStorage.getItem('aa_auth')):''}});
  const sjs = await sup.json();
  const subs = sjs.ok? (sjs.submissions||[]) : [];
  const html = `<div style="margin-bottom:8px"><strong>${j.challenge.title}</strong><div style="color:var(--text3)">${j.challenge.description||''}</div></div>` + (subs.length? subs.map(s=>`<div style="padding:8px;border-top:1px solid var(--border)"><div><b>@${s.username}</b> ${s.phone?'/ '+s.phone:''}</div><div style="font-size:13px;color:var(--text3)">${s.tiktok_link||''}</div><div style="margin-top:6px"><button class="btn btn-primary btn-sm" onclick="pickWinner('${j.challenge.id}','${s.id}')">Pilih Pemenang</button></div></div>`).join('') : '<div class="empty-state"><p>Belum ada submission</p></div>';
  // show modal-like prompt
  const w = window.open('about:blank','submissions','width=600,height=600');
  w.document.body.innerHTML = `<div style="font-family:sans-serif;padding:12px">${html}</div>`;
}

async function pickWinner(challengeId, submissionId){
  if(!confirm('Pilih ini sebagai pemenang?')) return;
  const res = await fetch('/api/router?op=pick-winner',{method:'POST',headers:{'Content-Type':'application/json','Authorization':localStorage.getItem('aa_auth')?('Bearer '+localStorage.getItem('aa_auth')):''},body:JSON.stringify({challenge_id:challengeId,submission_id:submissionId})});
  const j = await res.json();
  if(j.ok){ alert('Pemenang dipilih'); } else alert('Gagal: '+(j.error||''));
}

// list submissions admin endpoint
async function listSubmissions(challengeId){
  const res = await fetch('/api/router?op=list-submissions&id='+encodeURIComponent(challengeId),{headers:{'Authorization':localStorage.getItem('aa_auth')?('Bearer '+localStorage.getItem('aa_auth')):''}});
  return res.json();
}

loadChallenges();
