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
  if(!settings.apiKey){addChatMsg('ai','❌ API Key OpenAI belum diset. Masuk ke Settings dulu.');return;}
  addChatMsg('user',msg);input.value='';autoResize(input);
  chatHistory.push({role:'user',content:msg});
  const loadId=addChatMsg('ai','<div class="loading"><span></span><span></span><span></span></div>');
  document.getElementById('chatSend').disabled=true;
  const sys=aiMode==='analyst'
    ?`Kamu AI Analyst untuk TikTok Seller Affiliate SKINKU. Jawab casual, to the point, actionable, Bahasa Indonesia.\n\n${buildDataContext()}`
    :`Kamu developer expert yang bantu update website Affiliate Analyzer SKINKU. Website ini HTML+CSS+JS modular (file dipisah per bagian) dengan backend Supabase + bot Telegram interaktif multi-user + halaman publik: index.html (dashboard, perlu login), podium.html (halaman PUBLIK tanpa login, podium top 3 GMV & video dengan username disensor), css/style.css (semua styling, termasuk theme dark default & light pastel lewat [data-theme="light"]), js/ dipecah jadi state.js, tiktok.js (link otomatis ke profil TikTok kreator), utils.js, api-client.js (komunikasi ke /api/files & /api/exclusive), notifications.js (badge alert sidebar, toast, animasi angka KPI, toggle theme dark/light), auth.js, upload.js (upload + sync Supabase), dashboard.js, creator-table.js (tabel Kreator List), exclusive.js (kolam Affiliate Exclusive, tersimpan di Supabase), charts.js (grafik GMV/sampel/video/trend pakai Chart.js), ai-chat.js, settings.js, nav.js (termasuk hapus file), app.js. Backend ada di api/: _supabase.js (koneksi server-side, JANGAN pernah taruh service_role key di frontend), _creator-logic.js (port logic status/saran versi server, dipakai bot & podium), _rate-limit.js (rate limiter berbasis tabel rate_limits di Supabase, dipakai send-otp & verify-otp buat anti brute-force), files.js, exclusive.js (keduanya sudah ada validasi input/limit panjang), telegram-webhook.js (bot Telegram 2-arah pakai inline button, balas data dari Supabase, ada sistem whitelist akses lewat tabel bot_users + Owner Panel khusus TELEGRAM_CHAT_ID owner buat /adduser dan /removeuser), setup-webhook.js (daftarin webhook sekali), cron-daily-summary.js (notifikasi harian otomatis jam 9 pagi WIB ke semua orang di whitelist, dijadwalkan lewat vercel.json crons), podium.js (endpoint PUBLIK tanpa auth, return data podium dengan username yang sudah disensor di server), send-otp.js, verify-otp.js (keduanya wajib env var OTP_SECRET, sudah rate-limited per-IP). vercel.json juga punya security headers (X-Frame-Options dkk) dan rewrite /podium -> podium.html. Semua data (file upload, data kreator, kolam exclusive, whitelist bot) tersimpan permanen di Supabase, bukan localStorage, jadi tidak hilang saat refresh/ganti device, dan bisa diakses juga lewat bot Telegram oleh owner maupun orang di whitelist. Kalau diminta update: jelaskan perubahannya, sebutkan file mana yang perlu diubah (termasuk apakah perlu disinkronkan ke telegram-webhook.js/_creator-logic.js/cron-daily-summary.js/podium.js kalau menyangkut logic status kreator atau notifikasi), berikan kode yang dimodifikasi, jelaskan cara apply-nya. Kalau perubahan butuh kolom baru di database, sebutkan juga perlu ALTER TABLE di Supabase SQL Editor. Kalau perubahan menyentuh podium.html atau api/podium.js, ingatkan bahwa halaman itu publik tanpa login jadi hati-hati jangan sampai expose data sensitif tanpa sensor. Jawab casual Bahasa Indonesia.`;
  try{
    const res=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${settings.apiKey}`},body:JSON.stringify({model:settings.model,messages:[{role:'system',content:sys},...chatHistory.slice(-10)],max_tokens:2000,temperature:0.7})});
    const data=await res.json();
    if(data.error)throw new Error(data.error.message);
    const reply=data.choices[0].message.content;
    chatHistory.push({role:'assistant',content:reply});
    const formatted=reply.replace(/```(\w*)\n?([\s\S]*?)```/g,(_,lang,code)=>`<div class="code-block">${code.trim()}</div><button class="dl-btn" onclick="downloadCode(\`${code.trim().replace(/`/g,'\\`')}\`,'${lang||'html'}')">⬇ Download kode</button>`).replace(/\n/g,'<br>');
    updateChatMsg(loadId,formatted);
  }catch(err){updateChatMsg(loadId,`❌ Error: ${err.message}`);}
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

// ---------- Clear Chat ----------
// Hapus seluruh riwayat percakapan (UI + history yang dikirim ke API), reset ke pesan welcome awal.
function clearChat(){
  if(!confirm('Hapus semua riwayat chat? Tindakan ini tidak bisa dibatalkan.'))return;
  chatHistory=[];
  mc=0;
  const box=document.getElementById('chatMessages');
  box.innerHTML=`<div class="chat-msg">
    <div class="chat-avatar av-ai">AI</div>
    <div class="chat-bubble b-ai">Chat sudah dibersihkan. 🧹<br><br>Mau mulai dari mana? Pilih salah satu suggestion di bawah, atau tanya bebas.</div>
  </div>`;
  renderSuggestions();
  if(typeof toast==='function')toast('Chat dibersihkan','success');
}

// ---------- Analyze (full data analysis, satu klik) ----------
// Auto-switch ke mode Analisis Data, lalu kirim prompt analisis menyeluruh tanpa
// user perlu ngetik manual. Hasilnya summary performa + rekomendasi actionable.
function runFullAnalysis(){
  if(!allData.length){ if(typeof toast==='function')toast('Belum ada data untuk dianalisis. Upload dulu.','error'); return; }
  if(aiMode!=='analyst') setAIMode('analyst');
  const prompt='Analisis menyeluruh performa affiliate gua sekarang: ringkas kondisi keseluruhan, sebutkan kreator yang paling perlu diperhatikan (baik top perform maupun yang bermasalah), funnel konversi sampel ke video ke closing, dan kasih 3-5 rekomendasi aksi paling prioritas buat minggu ini.';
  document.getElementById('chatInput').value=prompt;
  sendChat();
}
