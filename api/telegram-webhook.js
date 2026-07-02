// api/telegram-webhook.js
// Bot Telegram 2-arah untuk SKINKU Affiliate Analyzer.
// Akses: hanya grup Telegram (TELEGRAM_GROUP_CHAT_ID di env var Vercel).
//
// FITUR:
//   /start atau pesan apapun → tampilkan menu tombol langsung
//   Tombol data  → Ringkasan, Top Perform, Ghost, Rekomendasi, Kontrak Expire
//   Tombol aksi  → Push File (upload xlsx/csv lewat chat), Clear Chat (hapus semua pesan)
//   Tombol nav   → Refresh (kembali ke menu), Buka Dashboard (link web)
//
// TABEL SUPABASE TAMBAHAN (jalankan sekali di SQL Editor):
//   create table if not exists bot_messages (
//     id bigint generated always as identity primary key,
//     chat_id text not null,
//     message_id bigint not null,
//     created_at timestamptz not null default now()
//   );
//   create index if not exists idx_bot_messages_chat_id on bot_messages (chat_id);

const { getSupabase }    = require('./_supabase');
const { getStatus, isGhost, mergeRows, fmtRp } = require('./_creator-logic');
const { parseFileBuffer } = require('./_file-parser');

const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const SITE_URL     = process.env.SITE_URL; // https://your-project.vercel.app
const TG_API       = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TG_FILE_API  = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

// ─── Telegram helpers ────────────────────────────────────────────────────────

async function tgCall(method, payload) {
  const r = await fetch(`${TG_API}/${method}`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify(payload),
  });
  return r.json();
}

async function sendMessage(chatId, text, keyboard) {
  const result = await tgCall('sendMessage', {
    chat_id     : chatId,
    text,
    parse_mode  : 'Markdown',
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
  });
  // Track pesan bot supaya Clear Chat bisa hapus
  if (result?.ok && result.result?.message_id) {
    trackMsg(chatId, result.result.message_id).catch(() => {});
  }
  return result;
}

function editMessage(chatId, msgId, text, keyboard) {
  return tgCall('editMessageText', {
    chat_id     : chatId,
    message_id  : msgId,
    text,
    parse_mode  : 'Markdown',
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined,
  });
}

function ackCallback(id) {
  return tgCall('answerCallbackQuery', { callback_query_id: id });
}

function delMsg(chatId, msgId) {
  return tgCall('deleteMessage', { chat_id: chatId, message_id: msgId });
}

// ─── Message tracking (untuk Clear Chat) ─────────────────────────────────────

async function trackMsg(chatId, msgId) {
  const sb = getSupabase();
  await sb.from('bot_messages').insert({ chat_id: String(chatId), message_id: msgId });
}

async function getTrackedMsgs(chatId) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('bot_messages').select('message_id').eq('chat_id', String(chatId));
  if (error) throw new Error(error.message);
  return (data || []).map(r => r.message_id);
}

async function clearTrackedMsgs(chatId) {
  const sb = getSupabase();
  await sb.from('bot_messages').delete().eq('chat_id', String(chatId));
}

// ─── Keyboard layouts ─────────────────────────────────────────────────────────
//
//  ┌──────────────────────────────────┐
//  │      📊 Ringkasan Hari Ini       │
//  ├─────────────────┬────────────────┤
//  │  🔥 Top Perform │ 👻 Ghost       │
//  ├─────────────────┴────────────────┤
//  │ 🔵 Rekomendasi  │ ⏰ Kontrak     │
//  ├─────────────────┴────────────────┤
//  │  📤 Push File   │ 🌐 Dashboard  │
//  ├──────────────────────────────────┤
//  │            🔄 Refresh            │
//  ├──────────────────────────────────┤
//  │         🗑 Clear Chat            │
//  └──────────────────────────────────┘

function menuKeyboard() {
  const dashboard = SITE_URL
    ? [{ text: '🌐 Buka Dashboard', url: SITE_URL }]
    : [];

  return [
    [{ text: '📊 Ringkasan Hari Ini',  callback_data: 'summary'   }],
    [{ text: '🔥 Top Perform',         callback_data: 'perform'   },
     { text: '👻 Ghost Kreator',       callback_data: 'ghost'     }],
    [{ text: '🔵 Rekomendasi Sampel',  callback_data: 'rekomen'   },
     { text: '⏰ Kontrak Expire',      callback_data: 'expiring'  }],
    [{ text: '📤 Push File',           callback_data: 'push_info' },
     ...dashboard],
    [{ text: '🔄 Refresh',             callback_data: 'menu'      }],
    [{ text: '🗑 Clear Chat',          callback_data: 'clear_confirm' }],
  ];
}

function backKeyboard() {
  const rows = [];
  if (SITE_URL) rows.push([{ text: '🌐 Buka Dashboard', url: SITE_URL }]);
  rows.push([{ text: '« Menu Utama', callback_data: 'menu' }]);
  return rows;
}

function confirmKeyboard() {
  return [
    [{ text: '✅ Ya, hapus semua pesan', callback_data: 'clear_execute' }],
    [{ text: '❌ Batal',               callback_data: 'menu'           }],
  ];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuth(chatId) {
  return Boolean(GROUP_CHAT_ID) && String(chatId) === String(GROUP_CHAT_ID);
}

// ─── Data loader ──────────────────────────────────────────────────────────────

async function loadData() {
  const sb = getSupabase();
  const { data: rows,      error: e1 } = await sb.from('creator_rows').select('*');
  const { data: exclusive, error: e2 } = await sb.from('exclusive_creators').select('*');
  if (e1) throw new Error(e1.message);
  if (e2) throw new Error(e2.message);

  const mapped = (rows || []).map(r => ({
    name         : r.name,
    sampelDiminta: r.sampel_diminta  || 0,
    sampelTerkirim: r.sampel_terkirim || 0,
    videoSampel  : r.video_sampel    || 0,
    liveSampel   : r.live_sampel     || 0,
    gmv          : r.gmv             || 0,
    roi45        : r.roi45           || 0,
    roi90        : r.roi90           || 0,
    orders       : r.orders          || 0,
    src          : r.src             || 'sample',
  }));

  return { all: mergeRows(mapped), exclusive: exclusive || [] };
}

// ─── Menu builders ────────────────────────────────────────────────────────────

async function buildMenu() {
  return {
    text    : `🤖 *Affiliate Analyzer Bot*\n\nHalo! Mau lihat data apa hari ini?`,
    keyboard: menuKeyboard(),
  };
}

async function buildSummary() {
  const { all } = await loadData();
  if (!all.length) return { text: '📊 *Ringkasan*\n\n_Belum ada data. Upload dulu lewat 📤 Push File atau website._', keyboard: backKeyboard() };

  const gmv    = all.reduce((s, r) => s + r.gmv, 0);
  const video  = all.reduce((s, r) => s + r.videoSampel, 0);
  const sampel = all.reduce((s, r) => s + r.sampelTerkirim, 0);

  const perform   = all.filter(r => getStatus(r) === 'perform').length;
  const boncos    = all.filter(r => getStatus(r) === 'boncos').length;
  const breakeven = all.filter(r => getStatus(r) === 'breakeven').length;
  const ghost     = all.filter(isGhost).length;
  const potensi   = all.filter(r => getStatus(r) === 'potential').length;

  return {
    text: `📊 *Ringkasan Hari Ini*\n\n` +
      `👥 Total kreator : *${all.length}*\n` +
      `💰 Total GMV     : *${fmtRp(gmv)}*\n` +
      `📦 Sampel kirim  : *${sampel} pcs*\n` +
      `🎬 Video posting : *${video}*\n\n` +
      `🔥 Perform    : *${perform}*\n` +
      `🔄 Break-even : *${breakeven}*\n` +
      `❌ Boncos     : *${boncos}*\n` +
      `🔵 Potensi    : *${potensi}*\n` +
      `👻 Ghost      : *${ghost}*`,
    keyboard: backKeyboard(),
  };
}

async function buildPerform() {
  const { all } = await loadData();
  const top = [...all].filter(r => getStatus(r) === 'perform').sort((a, b) => b.gmv - a.gmv).slice(0, 10);
  if (!top.length) return { text: '🔥 *Top Perform*\n\n_Belum ada kreator dengan status Perform._', keyboard: backKeyboard() };
  const lines = top.map((r, i) =>
    `${i + 1}\\. [@${r.name}](https://www.tiktok.com/@${r.name}) — ${fmtRp(r.gmv)} \\(ROI ${r.roi45.toFixed(1)}x\\)`);
  return { text: `🔥 *Top Perform* \\(${top.length}\\)\n\n${lines.join('\n')}`, keyboard: backKeyboard() };
}

async function buildGhost() {
  const { all } = await loadData();
  const ghosts = all.filter(isGhost);
  if (!ghosts.length) return { text: '👻 *Ghost Kreator*\n\n✅ _Tidak ada ghost kreator saat ini\\!_', keyboard: backKeyboard() };
  const lines = ghosts.slice(0, 15).map((r, i) =>
    `${i + 1}\\. [@${r.name}](https://www.tiktok.com/@${r.name}) — ${r.sampelTerkirim} sampel, 0 video`);
  const more = ghosts.length > 15 ? `\n\n_\\+${ghosts.length - 15} lainnya_` : '';
  const keyboard = [
    [{ text: '📲 Follow Up ke Grup WA', callback_data: 'followup_wa' }],
    ...backKeyboard(),
  ];
  return { text: `👻 *Ghost Kreator* \\(${ghosts.length}\\)\n\n${lines.join('\n')}${more}`, keyboard };
}

async function buildRekomen() {
  const { all } = await loadData();
  const list = [...all].filter(r => getStatus(r) === 'potential').sort((a, b) => b.gmv - a.gmv).slice(0, 10);
  if (!list.length) return { text: '🔵 *Rekomendasi Sampel*\n\n_Belum ada kreator potensial saat ini._', keyboard: backKeyboard() };
  const lines = list.map((r, i) =>
    `${i + 1}\\. [@${r.name}](https://www.tiktok.com/@${r.name}) — GMV organic ${fmtRp(r.gmv)}`);
  return { text: `🔵 *Rekomendasi Sampel* \\(${list.length}\\)\n\n${lines.join('\n')}`, keyboard: backKeyboard() };
}

async function buildExpiring() {
  const { exclusive } = await loadData();
  const now  = new Date();
  const in7d = new Date(now.getTime() + 7 * 86400 * 1000);
  const expired  = exclusive.filter(e => e.expire && new Date(e.expire) < now);
  const expiring = exclusive.filter(e => e.expire && new Date(e.expire) >= now && new Date(e.expire) <= in7d);
  if (!expired.length && !expiring.length)
    return { text: '⏰ *Kontrak/VIP*\n\n✅ _Tidak ada kontrak yang mau atau sudah expire._', keyboard: backKeyboard() };

  const lines = [];
  if (expired.length)  lines.push('*🔴 Sudah Expired:*',  ...expired.map(e  => `• [@${e.username}](https://tiktok.com/@${e.username}) — ${e.expire}`), '');
  if (expiring.length) lines.push('*🟡 Expire ≤7 hari:*', ...expiring.map(e => `• [@${e.username}](https://tiktok.com/@${e.username}) — ${e.expire}`));
  return { text: `⏰ *Kontrak/VIP*\n\n${lines.join('\n')}`, keyboard: backKeyboard() };
}

function buildPushInfo() {
  return {
    text: `📤 *Push File ke Dashboard*\n\n` +
      `Kirim file langsung ke chat ini \\(sebagai dokumen, bukan foto\\):\n\n` +
      `✅  \\.xlsx atau \\.xls \\(Excel\\)\n` +
      `✅  \\.csv\n` +
      `❌  Word, PDF, gambar — belum didukung\n\n` +
      `Format kolom sama dengan halaman Upload di website\\.\n` +
      `Bot otomatis baca & simpan ke Supabase — data langsung muncul di dashboard\\.`,
    keyboard: backKeyboard(),
  };
}

function buildClearConfirm() {
  return {
    text: `🗑 *Clear Chat*\n\n` +
      `Bot akan menghapus semua pesan di chat ini yang sudah ter\\-track sejak fitur ini aktif\\.` +
      ` Ini termasuk pesan dari semua member\\.\n\n` +
      `⚠️ _Tindakan ini tidak bisa dibatalkan\\._`,
    keyboard: confirmKeyboard(),
  };
}

function escCode(str) {
  // Cuma escape backslash & backtick (yang bisa merusak blok kode ```...```),
  // sengaja TIDAK escape karakter markdown lain (* _ dst) karena teks ini
  // memang didesain buat di-copy-paste APA ADANYA ke WhatsApp — tanda bintang
  // *tunggal* di WA juga berarti bold, jadi format itu justru ikut kebawa.
  return String(str || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
}

function buildWaFollowUpText(chunk, startIndex, partLabel) {
  const list = chunk.map((r, i) => `${startIndex + i + 1}. @${r.name} (${r.sampelTerkirim} sampel, 0 video)`).join('\n');
  return `Halo kak! 👋

Tim *SKINKU Affiliate* mau follow up beberapa kreator yang sampel-nya sudah dikirim, tapi sampai saat ini belum ada video yang ter-posting${partLabel}:

${list}

Kalau ada kendala dalam proses bikin konten, boleh banget diinfokan ke kami ya, biar bisa kita bantu carikan solusinya 🙏
Ditunggu kabar & update video-nya dalam waktu dekat ya kak, terima kasih banyak! 🌸

— Tim SKINKU Affiliate`;
}

// ─── Follow Up WA handler ─────────────────────────────────────────────────────
// Semi-otomatis: bot menyiapkan teks pesan siap-paste (bukan kirim WA langsung),
// karena hosting saat ini (Vercel serverless) tidak bisa menjaga sesi WhatsApp
// tetap nyala 24 jam. Teksnya dibungkus blok kode ``` ``` supaya tinggal
// sekali tap buat copy semuanya di Telegram, lalu tinggal paste manual ke
// grup WhatsApp afiliate.
async function handleFollowUpWa(chatId, msgId) {
  const { all } = await loadData();
  const ghosts = all.filter(isGhost);

  if (!ghosts.length) {
    await editMessage(chatId, msgId,
      '📲 *Follow Up ke Grup WA*\n\n✅ _Tidak ada ghost kreator yang perlu di\\-follow up saat ini\\!_',
      backKeyboard());
    return;
  }

  const CHUNK_SIZE = 60; // jaga-jaga biar tiap pesan tetap di bawah limit 4096 karakter Telegram
  const chunks = [];
  for (let i = 0; i < ghosts.length; i += CHUNK_SIZE) chunks.push(ghosts.slice(i, i + CHUNK_SIZE));

  const splitNote = chunks.length > 1
    ? ` \\(dikirim jadi ${chunks.length} bagian karena listnya panjang — paste semua bagiannya ya\\)`
    : '';
  const intro = `📲 *Follow Up ke Grup WA* \\(${ghosts.length} kreator\\)\n\n` +
    `Tap teksnya buat copy, terus paste ke grup WA afiliate kamu${splitNote}:`;

  await editMessage(chatId, msgId, intro, backKeyboard());

  for (let idx = 0; idx < chunks.length; idx++) {
    const startIndex = idx * CHUNK_SIZE;
    const partLabel = chunks.length > 1 ? ` (bagian ${idx + 1}/${chunks.length})` : '';
    const waText = buildWaFollowUpText(chunks[idx], startIndex, partLabel);
    const block = '```\n' + escCode(waText) + '\n```';
    // Cuma bagian terakhir yang dikasih tombol nav, biar chat-nya nggak penuh tombol berulang.
    await sendMessage(chatId, block, idx === chunks.length - 1 ? backKeyboard() : undefined);
  }
}

// ─── Route map ────────────────────────────────────────────────────────────────

const ROUTES = {
  menu        : buildMenu,
  summary     : buildSummary,
  perform     : buildPerform,
  ghost       : buildGhost,
  rekomen     : buildRekomen,
  expiring    : buildExpiring,
  push_info   : async () => buildPushInfo(),
  clear_confirm: async () => buildClearConfirm(),
};

// ─── Push File handler ────────────────────────────────────────────────────────

async function handleDocument(message) {
  const doc      = message.document;
  const fileName = doc.file_name || 'file';
  const ext      = fileName.toLowerCase().split('.').pop();

  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    return sendMessage(message.chat.id,
      `⚠️ Format *\\.${ext}* belum didukung\\. Kirim file *\\.xlsx*, *\\.xls*, atau *\\.csv* ya\\.`,
      backKeyboard());
  }
  if (doc.file_size > 10 * 1024 * 1024) {
    return sendMessage(message.chat.id, '⚠️ File terlalu besar \\(maks 10 MB\\)\\.', backKeyboard());
  }

  await sendMessage(message.chat.id, `⏳ Memproses *${escMd(fileName)}*\\.\\.\\.`);

  try {
    const fileInfo = await tgCall('getFile', { file_id: doc.file_id });
    if (!fileInfo.ok) throw new Error(fileInfo.description);

    const fileRes = await fetch(`${TG_FILE_API}/${fileInfo.result.file_path}`);
    if (!fileRes.ok) throw new Error('Gagal download file dari Telegram');
    const buf = Buffer.from(await fileRes.arrayBuffer());

    const parsed = parseFileBuffer(buf, fileName);
    if (parsed.error) {
      const msg = {
        no_recognizable_data: 'Kolom tidak dikenali\\. Pastikan format kolom sesuai template\\.',
        parse_failed        : 'File rusak atau corrupt\\.',
      }[parsed.error.split(':')[0]] || escMd(parsed.error);
      return sendMessage(message.chat.id, `❌ Gagal proses *${escMd(fileName)}*: ${msg}`, backKeyboard());
    }

    const sb = getSupabase();
    let totalRows = 0;
    for (const sheet of parsed.sheets) {
      if (sheet.rows.length > 5000) continue; // skip sheet terlalu besar
      const { data: fileRow, error: fErr } = await sb
        .from('uploaded_files')
        .insert({ file_name: fileName.slice(0, 255), file_type: sheet.type, row_count: sheet.rows.length })
        .select().single();
      if (fErr) throw new Error(fErr.message);

      const payload = sheet.rows.map(r => ({
        file_id       : fileRow.id,
        name          : String(r.name || '').slice(0, 200),
        sampel_diminta: Number(r.sampelDiminta)  || 0,
        sampel_terkirim: Number(r.sampelTerkirim) || 0,
        video_sampel  : Number(r.videoSampel)    || 0,
        live_sampel   : Number(r.liveSampel)     || 0,
        gmv           : Number(r.gmv)            || 0,
        roi45         : Number(r.roi45)          || 0,
        roi90         : Number(r.roi90)          || 0,
        orders        : Number(r.orders)         || 0,
        komisi        : Number(r.komisi)         || 0,
        refund        : Number(r.refund)         || 0,
        aov           : Number(r.aov)            || 0,
        src           : r.src === 'transaction' ? 'transaction' : 'sample',
      }));
      const { error: rErr } = await sb.from('creator_rows').insert(payload);
      if (rErr) throw new Error(rErr.message);
      totalRows += sheet.rows.length;
    }

    await sendMessage(message.chat.id,
      `✅ *${escMd(fileName)}* berhasil disimpan\\!\n\n👥 ${totalRows} kreator masuk ke dashboard\\.`,
      backKeyboard());
  } catch (err) {
    console.error('push-file error:', err);
    await sendMessage(message.chat.id,
      `❌ Gagal proses *${escMd(fileName)}*: ${escMd(err.message)}`,
      backKeyboard());
  }
}

// ─── Clear Chat handler ───────────────────────────────────────────────────────

async function handleClearExecute(chatId) {
  let ids;
  try   { ids = await getTrackedMsgs(chatId); }
  catch (err) {
    await sendMessage(chatId, `❌ Gagal ambil daftar pesan: ${escMd(err.message)}`, backKeyboard());
    return;
  }

  if (!ids.length) {
    await sendMessage(chatId, '✅ Tidak ada pesan ter\\-track untuk dihapus\\.', backKeyboard());
    return;
  }

  let deleted = 0, failed = 0;
  for (const id of ids) {
    const r = await delMsg(chatId, id).catch(() => ({ ok: false }));
    r?.ok ? deleted++ : failed++;
  }

  try { await clearTrackedMsgs(chatId); } catch (_) {}

  // Pesan ini sengaja tidak di-track (biar tidak numpuk balik)
  await tgCall('sendMessage', {
    chat_id   : chatId,
    text      : `🧹 Selesai\\! *${deleted}* pesan terhapus${failed ? `, *${failed}* gagal \\(mungkin sudah dihapus manual atau terlalu lama\\)` : '\\.'}`,
    parse_mode: 'MarkdownV2',
  });
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function escMd(str) {
  return String(str || '').replace(/[_*[\]()~`>#+=|{}.!\\-]/g, c => '\\' + c);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  // Telegram selalu POST; GET cuma buat cek "apakah endpoint hidup"
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  if (!BOT_TOKEN || !GROUP_CHAT_ID) {
    console.error('[webhook] BOT_TOKEN atau GROUP_CHAT_ID belum diset');
    return res.status(200).json({ ok: true });
  }

  try {
    const update = req.body || {};
    const chatId = update.message?.chat?.id ?? update.callback_query?.message?.chat?.id;
    if (!chatId || !isAuth(chatId)) return res.status(200).json({ ok: true });

    // ── Callback (tombol ditekan) ──
    if (update.callback_query) {
      const cq     = update.callback_query;
      const action = cq.data;
      ackCallback(cq.id).catch(() => {});

      if (action === 'clear_execute') {
        await editMessage(cq.message.chat.id, cq.message.message_id,
          '🧹 Menghapus semua pesan yang ter\\-track\\.\\.\\.', []);
        await handleClearExecute(cq.message.chat.id);
        return res.status(200).json({ ok: true });
      }

      if (action === 'followup_wa') {
        try {
          await handleFollowUpWa(cq.message.chat.id, cq.message.message_id);
        } catch (err) {
          await editMessage(cq.message.chat.id, cq.message.message_id,
            `⚠️ Gagal: ${escMd(err.message)}`, backKeyboard());
        }
        return res.status(200).json({ ok: true });
      }

      const builder = ROUTES[action] ?? ROUTES.menu;
      try {
        const { text, keyboard } = await builder();
        await editMessage(cq.message.chat.id, cq.message.message_id, text, keyboard);
      } catch (err) {
        await editMessage(cq.message.chat.id, cq.message.message_id,
          `⚠️ Gagal: ${escMd(err.message)}`, backKeyboard());
      }
      return res.status(200).json({ ok: true });
    }

    // ── Pesan masuk ──
    if (update.message) {
      const msg = update.message;
      // Track message_id semua pesan masuk (termasuk dari member selain bot)
      if (msg.message_id) trackMsg(msg.chat.id, msg.message_id).catch(() => {});

      // File dokumen → push file
      if (msg.document) {
        await handleDocument(msg);
        return res.status(200).json({ ok: true });
      }

      // Teks apapun (termasuk /start) → tampilkan menu
      const { text, keyboard } = await buildMenu();
      await sendMessage(msg.chat.id, text, keyboard);
      return res.status(200).json({ ok: true });
    }

  } catch (err) {
    console.error('[webhook] Unhandled error:', err);
  }

  return res.status(200).json({ ok: true }); // selalu 200 ke Telegram
};
