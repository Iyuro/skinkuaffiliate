// ============ AI CHAT ============
const suggestions={
  analyst:['Siapa kreator paling perform?','Kreator mana yang boncos?','Siapa ghost kreator?','Rekomendasi kirim sampel berikutnya','Summary performa keseluruhan'],
  dev:['Tambahkan fitur filter by followers','Ubah warna tema','Tambahkan kolom tanggal terakhir posting','Tambahkan grafik GMV per kreator','Buat fitur blacklist kreator']
};
function setAIMode(mode){
  aiMode=mode;
  document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.id==='mode-'+mode));
  document.getElementById('modeDesc').textContent=mode==='analyst'?'Tanya performa kreator affiliate lo':'Minta update fitur/tampilan website';
  renderSuggestions();
}
function renderSuggestions(){document.getElementById('chatSuggestions').innerHTML=(suggestions[aiMode]||[]).map(s=>`<span class="suggestion" onclick="sendSuggestion(this)">${s}</span>`).join('');}
function buildDataContext(){
  if(!allData.length)return 'Belum ada data kreator yang diupload.';
  const tGMV=allData.reduce((a,r)=>a+r.gmv,0),tK=allData.reduce((a,r)=>a+r.sampelTerkirim,0),tV=allData.reduce((a,r)=>a+r.videoSampel,0);
  const sm={};allData.forEach(r=>{const s=getStatus(r);sm[s]=(sm[s]||0)+1;});
  const top=allData.filter(r=>getStatus(r)==='perform').sort((a,b)=>b.gmv-a.gmv).slice(0,10);
  const boncos=allData.filter(r=>getStatus(r)==='boncos').slice(0,10);
  const ghosts=allData.filter(r=>r.sampelTerkirim>0&&r.videoSampel===0&&r.gmv===0).slice(0,10);
  const pot=allData.filter(r=>getStatus(r)==='potential').sort((a,b)=>b.gmv-a.gmv).slice(0,10);
  return `DATA AFFILIATE TIKTOK SKINKU:
Total: ${allData.length} kreator | GMV: ${fmtRp(tGMV)} | Sampel: ${tK} pcs | Video: ${tV}
Konversi: ${tK>0?((tV/tK)*100).toFixed(0):0}%
Status: Perform ${sm.perform||0} | Break-even ${sm.breakeven||0} | Boncos ${sm.boncos||0} | Potensi ${sm.potential||0} | Ghost ${allData.filter(r=>r.sampelTerkirim>0&&r.videoSampel===0&&r.gmv===0).length}
TOP PERFORM: ${top.map(r=>`@${r.name}(GMV:${fmtRp(r.gmv)},ROI:${r.roi45>0?r.roi45.toFixed(1)+'x':'N/A'},Vid:${r.videoSampel})`).join(' ')}
BONCOS: ${boncos.map(r=>`@${r.name}(GMV:${fmtRp(r.gmv)},ROI:${r.roi45>0?r.roi45.toFixed(1)+'x':'N/A'})`).join(' ')}
GHOST: ${ghosts.map(r=>`@${r.name}(${r.sampelTerkirim}sampel,0vid)`).join(' ')}
POTENSI: ${pot.map(r=>`@${r.name}(GMV:${fmtRp(r.gmv)})`).join(' ')}
EXCLUSIVE: ${exclusiveData.length} kreator terdaftar`;
}
async function sendChat(){
  const input=document.getElementById('chatInput'),msg=input.value.trim();
  if(!msg)return;
  if(!settings.apiKey){addChatMsg('ai',`${appIcon('warn','sm')} API Key OpenAI belum diset. Masuk ke Settings dulu.`);return;}
  addChatMsg('user',msg);input.value='';autoResize(input);
  chatHistory.push({role:'user',content:msg});
  const loadId=addChatMsg('ai','<div class="loading"><span></span><span></span><span></span></div>');
  document.getElementById('chatSend').disabled=true;
  const sys=aiMode==='analyst'
    ?`Kamu AI Analyst untuk TikTok Seller Affiliate SKINKU. Jawab casual, to the point, actionable, Bahasa Indonesia.\n\n${buildDataContext()}`
    :`Kamu developer expert yang bantu update website Affiliate Analyzer SKINKU. Website ini HTML+CSS+JS modular (file dipisah per bagian) dengan backend Supabase + bot Telegram interaktif: index.html (struktur halaman), css/style.css (semua styling), js/ dipecah jadi state.js, tiktok.js (link otomatis ke profil TikTok kreator), utils.js, api-client.js (komunikasi ke /api/files & /api/exclusive), notifications.js (badge alert sidebar, toast, animasi angka KPI), auth.js, upload.js (upload + sync Supabase), dashboard.js, creator-table.js (tabel Kreator List), exclusive.js (kolam Affiliate Exclusive, tersimpan di Supabase), charts.js (grafik GMV/sampel/video/trend pakai Chart.js), ai-chat.js, settings.js, nav.js (termasuk hapus file), app.js. Backend ada di api/: _supabase.js (koneksi server-side, JANGAN pernah taruh service_role key di frontend), _creator-logic.js (port logic status/saran versi server, dipakai bot), files.js, exclusive.js, telegram-webhook.js (bot Telegram 2-arah pakai inline button, balas data dari Supabase), setup-webhook.js (daftarin webhook sekali), send-otp.js, verify-otp.js. Semua data (file upload, data kreator, kolam exclusive) tersimpan permanen di Supabase, bukan localStorage, jadi tidak hilang saat refresh/ganti device, dan bisa diakses juga lewat bot Telegram. Kalau diminta update: jelaskan perubahannya, sebutkan file mana yang perlu diubah (termasuk apakah perlu disinkronkan ke telegram-webhook.js/_creator-logic.js kalau menyangkut logic status kreator), berikan kode yang dimodifikasi, jelaskan cara apply-nya. Kalau perubahan butuh kolom baru di database, sebutkan juga perlu ALTER TABLE di Supabase SQL Editor. Jawab casual Bahasa Indonesia.`;
  try{
    const res=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${settings.apiKey}`},body:JSON.stringify({model:settings.model,messages:[{role:'system',content:sys},...chatHistory.slice(-10)],max_tokens:2000,temperature:0.7})});
    const data=await res.json();
    if(data.error)throw new Error(data.error.message);
    const reply=data.choices[0].message.content;
    chatHistory.push({role:'assistant',content:reply});
    const formatted=reply.replace(/```(\w*)\n?([\s\S]*?)```/g,(_,lang,code)=>`<div class="code-block">${code.trim()}</div><button class="dl-btn" onclick="downloadCode(\`${code.trim().replace(/`/g,'\\`')}\`,'${lang||'html'}')">⬇ Download kode</button>`).replace(/\n/g,'<br>');
    updateChatMsg(loadId,formatted);
  }catch(err){updateChatMsg(loadId,`${appIcon('warn','sm')} Error: ${err.message}`);}
  document.getElementById('chatSend').disabled=false;
}
function downloadCode(code,ext){const blob=new Blob([code],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`update.${ext||'html'}`;a.click();}
let mc=0;
function addChatMsg(role,content){
  const id='msg-'+(++mc),isUser=role==='user',el=document.createElement('div');
  el.className=`chat-msg ${isUser?'user':''}`;el.id=id;
  el.innerHTML=`<div class="chat-avatar ${isUser?'av-user':'av-ai'}">${isUser?'LO':'AI'}</div><div class="chat-bubble ${isUser?'b-user':'b-ai'}">${content}</div>`;
  document.getElementById('chatMessages').appendChild(el);
  document.getElementById('chatMessages').scrollTop=99999;
  return id;
}
function updateChatMsg(id,content){const el=document.getElementById(id);if(el)el.querySelector('.chat-bubble').innerHTML=content;document.getElementById('chatMessages').scrollTop=99999;}
function sendSuggestion(el){document.getElementById('chatInput').value=el.textContent;sendChat();}
function handleChatKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}}
function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,100)+'px';}
