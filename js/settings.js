// ============ SETTINGS ============
function saveApiKey(){settings.apiKey=document.getElementById('apiKeyInput').value;localStorage.setItem('aa_apikey',settings.apiKey);updateApiStatus();}
function saveSettings(){settings.model=document.getElementById('modelSelect').value;localStorage.setItem('aa_settings',JSON.stringify(settings));}
function updateRange(inputId,labelId,type){
  const val=parseFloat(document.getElementById(inputId).value);settings[inputId]=val;
  const lbl=document.getElementById(labelId);
  if(type==='rp')lbl.textContent=val>=1000000?(val/1000000).toFixed(1)+'jt':Math.round(val/1000)+'rb';else lbl.textContent=val+'x';
  localStorage.setItem('aa_settings',JSON.stringify(settings));
  if(allData.length){renderKPIGrid();renderKreatorTable();renderDashboard();}
}
function updateApiStatus(){const ok=settings.apiKey&&settings.apiKey.startsWith('sk-');document.getElementById('apiDot').classList.toggle('ok',ok);document.getElementById('apiStatus').textContent=ok?'OpenAI: Terhubung':'OpenAI: Belum diset';}
function loadSettings(){
  const key=localStorage.getItem('aa_apikey');if(key){settings.apiKey=key;document.getElementById('apiKeyInput').value=key;}
  try{const s=JSON.parse(localStorage.getItem('aa_settings')||'{}');Object.assign(settings,s);if(s.model)document.getElementById('modelSelect').value=s.model;if(s.roiPerform){document.getElementById('roiPerform').value=s.roiPerform;document.getElementById('roiPerformLbl').textContent=s.roiPerform+'x';}if(s.gmvOrganic){document.getElementById('gmvOrganic').value=s.gmvOrganic;}}catch(e){}
  updateApiStatus();renderSuggestions();
}
