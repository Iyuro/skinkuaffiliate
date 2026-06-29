// ============ AUTH ============
function checkAuth(){
  if(authToken){ showApp(); } else { document.getElementById('loginScreen').style.display='flex'; }
}

async function requestOTP(){
  const btn=document.getElementById('otpRequestBtn');
  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span>Mengirim...';
  document.getElementById('step1Err').textContent='';
  try{
    const res=await fetch('/api/send-otp',{method:'POST',headers:{'Content-Type':'application/json'}});
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Gagal kirim OTP');
    otpToken=data.token;
    showStep('step2');
    document.querySelectorAll('.otp-digit')[0].focus();
    startResendTimer();
  }catch(err){
    document.getElementById('step1Err').textContent=err.message;
    btn.disabled=false;
    btn.innerHTML='<span class="btn-icon">📨</span> Kirim OTP ke Telegram';
  }
}

function startResendTimer(){
  let sec=60;
  const timerEl=document.getElementById('resendTimer');
  const btn=document.getElementById('resendBtn');
  btn.disabled=true;
  clearInterval(resendInterval);
  resendInterval=setInterval(()=>{
    timerEl.textContent=`Kirim ulang dalam ${sec}s • `;
    sec--;
    if(sec<0){clearInterval(resendInterval);timerEl.textContent='';btn.disabled=false;}
  },1000);
}

function backToStep1(){
  showStep('step1');
  const btn=document.getElementById('otpRequestBtn');
  btn.disabled=false;
  btn.innerHTML='<span class="btn-icon">📨</span> Kirim OTP ke Telegram';
  requestOTP();
}

function showStep(id){
  document.querySelectorAll('.login-step').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function otpInput(el,idx){
  const val=el.value.replace(/\D/g,'');
  el.value=val;
  if(val) el.classList.add('filled');
  else el.classList.remove('filled');
  if(val&&idx<5) document.querySelectorAll('.otp-digit')[idx+1].focus();
  if(idx===5&&val) verifyOTP();
}

function otpKey(e,idx){
  if(e.key==='Backspace'&&!e.target.value&&idx>0){
    document.querySelectorAll('.otp-digit')[idx-1].focus();
  }
}

async function verifyOTP(){
  const digits=[...document.querySelectorAll('.otp-digit')].map(i=>i.value);
  const otp=digits.join('');
  if(otp.length<6){document.getElementById('step2Err').textContent='Masukkan 6 digit OTP';return;}
  const btn=document.getElementById('verifyBtn');
  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span>Memverifikasi...';
  document.getElementById('step2Err').textContent='';
  try{
    const res=await fetch('/api/verify-otp',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({token:otpToken,otp})
    });
    const data=await res.json();
    if(!res.ok) throw new Error(data.error||'Verifikasi gagal');
    authToken=data.token;
    localStorage.setItem('aa_auth',authToken);
    showStep('step3');
    setTimeout(showApp,1200);
  }catch(err){
    document.getElementById('step2Err').textContent=err.message;
    btn.disabled=false;
    btn.innerHTML='<span class="btn-icon">✅</span> Verifikasi';
  }
}

async function showApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('appLayout').style.display='flex';
  loadSettings();
  showSyncStatus(true);
  await loadAllDataFromServer();
  showSyncStatus(false);
}

function showSyncStatus(loading){
  const el=document.getElementById('dataInfo');
  if(!el)return;
  if(loading)el.textContent='⏳ Memuat data tersimpan...';
}

function logout(){
  if(!confirm('Yakin mau logout?'))return;
  localStorage.removeItem('aa_auth');
  location.reload();
}
