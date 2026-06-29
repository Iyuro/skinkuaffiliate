// ============ RANK KREATOR — Leaderboard Lengkap ============
// Menampilkan semua kreator diurutkan berdasarkan metrik yang dipilih.
// Tab: GMV | Video | Sampel | Konversi

let currentRankTab = 'gmv';

function switchRankTab(tab){
  currentRankTab = tab;
  document.querySelectorAll('[id^="rankTab-"]').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('rankTab-' + tab);
  if(el) el.classList.add('active');
  renderRankTable();
}

const RANK_MEDAL = { 1:'🥇', 2:'🥈', 3:'🥉' };

const RANK_CONFIGS = {
  gmv: {
    title: '🏆 Ranking Kreator — GMV Tertinggi',
    sort: (a,b) => b.gmv - a.gmv,
    heads: ['Rank','Kreator','Status','GMV','Video','Sampel Terkirim','ROI 45h'],
    row: (r,i) => {
      const medal = RANK_MEDAL[i+1] || '';
      const rankNum = i+1;
      const rankClass = rankNum <= 3 ? `rank-top${rankNum}` : '';
      const st = getStatus(r), stInfo = STATUS_INFO[st] || {label:st,color:'var(--text3)'};
      return `<tr class="${rankClass}">
        <td style="font-weight:800;font-size:15px;color:${rankNum<=3?'var(--accent3)':'var(--text2)'};min-width:42px">${medal||rankNum}</td>
        <td>${renderCreatorLink(r.name)}</td>
        <td><span style="color:${stInfo.color};font-size:12px">${stInfo.label}</span></td>
        <td style="color:var(--accent3);font-weight:700">${fmtRp(r.gmv)}</td>
        <td style="color:var(--green)">${fmtN(r.videoSampel)}</td>
        <td>${fmtN(r.sampelTerkirim)}</td>
        <td style="color:${r.roi45>=3?'var(--green)':r.roi45>0?'var(--amber)':'var(--text3)'}">${r.roi45>0?r.roi45.toFixed(1)+'x':'—'}</td>
      </tr>`;
    }
  },
  video: {
    title: '🎬 Ranking Kreator — Video Terbanyak',
    sort: (a,b) => b.videoSampel - a.videoSampel,
    heads: ['Rank','Kreator','Status','Video','GMV','Sampel Terkirim','Konversi'],
    row: (r,i) => {
      const medal = RANK_MEDAL[i+1] || '';
      const rankNum = i+1;
      const rankClass = rankNum <= 3 ? `rank-top${rankNum}` : '';
      const st = getStatus(r), stInfo = STATUS_INFO[st] || {label:st,color:'var(--text3)'};
      const konv = r.sampelTerkirim>0 ? ((r.videoSampel/r.sampelTerkirim)*100).toFixed(0)+'%' : '—';
      return `<tr class="${rankClass}">
        <td style="font-weight:800;font-size:15px;color:${rankNum<=3?'var(--green)':'var(--text2)'};min-width:42px">${medal||rankNum}</td>
        <td>${renderCreatorLink(r.name)}</td>
        <td><span style="color:${stInfo.color};font-size:12px">${stInfo.label}</span></td>
        <td style="color:var(--green);font-weight:700">${fmtN(r.videoSampel)} video</td>
        <td style="color:var(--accent3)">${fmtRp(r.gmv)}</td>
        <td>${fmtN(r.sampelTerkirim)}</td>
        <td style="color:${r.sampelTerkirim>0&&r.videoSampel/r.sampelTerkirim>=1?'var(--green)':'var(--text3)'}">${konv}</td>
      </tr>`;
    }
  },
  sampel: {
    title: '📦 Ranking Kreator — Sampel Terkirim Terbanyak',
    sort: (a,b) => b.sampelTerkirim - a.sampelTerkirim || b.sampelDiminta - a.sampelDiminta,
    heads: ['Rank','Kreator','Status','Sampel Terkirim','Diminta','Video','GMV'],
    row: (r,i) => {
      const medal = RANK_MEDAL[i+1] || '';
      const rankNum = i+1;
      const rankClass = rankNum <= 3 ? `rank-top${rankNum}` : '';
      const st = getStatus(r), stInfo = STATUS_INFO[st] || {label:st,color:'var(--text3)'};
      return `<tr class="${rankClass}">
        <td style="font-weight:800;font-size:15px;color:${rankNum<=3?'var(--amber)':'var(--text2)'};min-width:42px">${medal||rankNum}</td>
        <td>${renderCreatorLink(r.name)}</td>
        <td><span style="color:${stInfo.color};font-size:12px">${stInfo.label}</span></td>
        <td style="color:var(--amber);font-weight:700">${fmtN(r.sampelTerkirim)} pcs</td>
        <td style="color:var(--text2)">${fmtN(r.sampelDiminta)}</td>
        <td style="color:var(--green)">${fmtN(r.videoSampel)}</td>
        <td style="color:var(--accent3)">${fmtRp(r.gmv)}</td>
      </tr>`;
    }
  },
  konversi: {
    title: '📈 Ranking Kreator — Konversi Terbaik (min. 1 sampel terkirim)',
    sort: (a,b) => {
      const ka = a.sampelTerkirim>0 ? a.videoSampel/a.sampelTerkirim : -1;
      const kb = b.sampelTerkirim>0 ? b.videoSampel/b.sampelTerkirim : -1;
      return kb - ka || b.videoSampel - a.videoSampel;
    },
    heads: ['Rank','Kreator','Status','Konversi','Video','Sampel Terkirim','GMV'],
    row: (r,i) => {
      const medal = RANK_MEDAL[i+1] || '';
      const rankNum = i+1;
      const rankClass = rankNum <= 3 ? `rank-top${rankNum}` : '';
      const st = getStatus(r), stInfo = STATUS_INFO[st] || {label:st,color:'var(--text3)'};
      const konvNum = r.sampelTerkirim>0 ? (r.videoSampel/r.sampelTerkirim*100) : 0;
      const konvStr = r.sampelTerkirim>0 ? konvNum.toFixed(0)+'%' : '—';
      const konvColor = konvNum>=100?'var(--green)':konvNum>=50?'var(--amber)':'var(--red)';
      return `<tr class="${rankClass}">
        <td style="font-weight:800;font-size:15px;color:${rankNum<=3?'var(--accent)':'var(--text2)'};min-width:42px">${medal||rankNum}</td>
        <td>${renderCreatorLink(r.name)}</td>
        <td><span style="color:${stInfo.color};font-size:12px">${stInfo.label}</span></td>
        <td style="color:${konvColor};font-weight:700;font-size:15px">${konvStr}</td>
        <td style="color:var(--green)">${fmtN(r.videoSampel)}</td>
        <td>${fmtN(r.sampelTerkirim)}</td>
        <td style="color:var(--accent3)">${fmtRp(r.gmv)}</td>
      </tr>`;
    }
  }
};

// STATUS_INFO helper supaya bisa pakai di rank.js tanpa duplikasi
const STATUS_INFO = {
  perform: { label:'🔥 Perform', color:'var(--green)' },
  boncos:  { label:'❌ Boncos',  color:'var(--red)' },
  potential:{ label:'🔵 Potensi', color:'var(--accent)' },
  ghost:   { label:'👻 Ghost',   color:'var(--amber)' },
  pending: { label:'⏳ Blm Post',color:'var(--text3)' },
  organic: { label:'🌱 Organic', color:'var(--green)' }
};

function renderRankTable(){
  const cfg = RANK_CONFIGS[currentRankTab];
  if(!cfg) return;
  document.getElementById('rankTableTitle').textContent = cfg.title;

  let data = [...allData].sort(cfg.sort);
  // untuk konversi: filter yang punya sampel terkirim
  if(currentRankTab === 'konversi') data = data.filter(r => r.sampelTerkirim > 0);

  const thead = document.getElementById('rankThead');
  const tbody = document.getElementById('rankTbody');
  if(!thead || !tbody) return;

  thead.innerHTML = '<tr>' + cfg.heads.map(h=>`<th style="color:var(--text3);font-size:11px;font-weight:600;padding:8px 10px;text-align:left;white-space:nowrap">${h}</th>`).join('') + '</tr>';

  if(!data.length){
    tbody.innerHTML = `<tr><td colspan="${cfg.heads.length}" style="text-align:center;padding:30px;color:var(--text3)">Belum ada data</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((r,i) => cfg.row(r,i)).join('');
}

function renderRankView(){
  if(!allData.length){
    document.getElementById('rankEmpty').style.display='block';
    document.getElementById('rankContent').style.display='none';
    return;
  }
  document.getElementById('rankEmpty').style.display='none';
  document.getElementById('rankContent').style.display='block';
  renderRankTable();
}
