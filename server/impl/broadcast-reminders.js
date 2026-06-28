const { getSupabase } = require('./_supabase');
const { getStatus, mergeRows, fmtRp } = require('./_creator-logic');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function tgCall(method, payload){
  const res = await fetch(`${TG_API}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  return res.json();
}

function sendMessage(chatId,text){
  return tgCall('sendMessage',{chat_id:chatId,text,parse_mode:'Markdown'});
}

async function loadAllData(){
  const supabase = getSupabase();
  const { data: rawRows } = await supabase.from('creator_rows').select('*');
  const appRows = (rawRows||[]).map(r=>({name:r.name, sampelTerkirim:r.sampel_terkirim||0,videoSampel:r.video_sampel||0,gmv:r.gmv||0,roi45:r.roi45||0}));
  const allData = mergeRows(appRows);
  return allData;
}

module.exports = async function handler(req,res){
  if(req.method!=='POST') return res.status(200).json({ok:true});
  if(!BOT_TOKEN) return res.status(500).json({error:'BOT_TOKEN not set'});
  try{
    const supabase = getSupabase();
    const allData = await loadAllData();
    const types = (req.body && req.body.types) || ['pending','breakeven'];
    const toRemind = allData.filter(r=>types.includes(getStatus(r))).slice(0,30);
    if(!toRemind.length) return res.status(200).json({ok:true, sent:0});
    const { data: subs } = await supabase.from('telegram_subscribers').select('*');
    const chatIds = (subs||[]).map(s=>s.chat_id).filter(Boolean);
    if(!chatIds.length) return res.status(200).json({ok:true, sent:0, reason:'no-subscribers'});
    const lines = toRemind.map((r,i)=>`${i+1}. [@${r.name}](https://www.tiktok.com/@${r.name}) — ${fmtRp(r.gmv)} • status: ${getStatus(r)}`);
    const text = `⏰ *Reminder Kreator*\n\nKreator dengan status pending/breakeven yang perlu follow-up:\n\n${lines.join('\n')}`;
    let sent=0;
    for(const chatId of chatIds){
      try{ await sendMessage(chatId,text); sent++; }catch(e){/* ignore per-subscriber errors */}
    }
    return res.status(200).json({ok:true,sent});
  }catch(err){
    console.error('broadcast-reminders error',err);
    return res.status(500).json({ok:false,error:err.message});
  }
}
