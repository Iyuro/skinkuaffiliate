// api/telegram-webhook.js
// Webhook bot Telegram 2-arah: orang ketik /start atau pesan apapun -> bot kasih menu
// inline button -> klik button -> bot query Supabase -> balas data terformat.
//
// AKSES: hanya grup Telegram (TELEGRAM_GROUP_CHAT_ID di env var). Pesan dari chat ID
// lain diam-diam di-ignore.
//
// FITUR TAMBAHAN:
// - Push File: kirim file .xlsx/.xls/.csv langsung ke chat -> otomatis diparse & disimpan
//   ke Supabase (creator_rows + uploaded_files), persis seperti upload lewat web.
// - Delete All Chat: hapus semua pesan (yang bot kirim maupun terima) di grup ini, dari
//   histori yang ter-track sejak fitur ini aktif. Memakai tabel bot_messages di Supabase
//   untuk mencatat message_id, karena Telegram Bot API tidak punya endpoint "hapus semua
//   sekaligus" -> di-loop satu-satu lewat deleteMessage.
//
// Setup sekali: daftarkan URL endpoint ini ke Telegram lewat setWebhook (lihat api/setup-webhook.js).
// Perlu tabel tambahan di Supabase, lihat supabase/schema-bot-messages.sql.

const { getSupabase } = require('./_supabase');
const { getStatus, isGhost, mergeRows, fmtRp } = require('./_creator-logic');
const { parseFileBuffer } = require('./_file-parser');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_CHAT_ID = process.env.TELEGRAM_GROUP_CHAT_ID;
const SITE_URL = process.env.SITE_URL; // contoh: https://affiliate-skinku.vercel.app -- dipakai buat tombol "Buka Dashboard"
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TG_FILE_API = `https://api.telegram.org/file/bot${BOT_TOKEN}`;

// ---------- Helper kirim pesan/edit pesan ke Telegram ----------
async function tgCall(method, payload) {
  const res = await fetch(`${TG_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

async function sendMessage(chatId, text, keyboard) {
  const result = await tgCall('sendMessage', {
    chat_id: chatId, text, parse_mode: 'Markdown',
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
  });
  if (result && result.ok && result.result) trackMessage(chatId, result.result.message_id).catch(() => {});
  return result;
}

async function editMessage(chatId, messageId, text, keyboard) {
  return tgCall('editMessageText', {
    chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown',
    reply_markup: keyboard ? { inline_keyboard: keyboard } : undefined
  });
}

function answerCallback(callbackQueryId, text) {
  return tgCall('answerCallbackQuery', { callback_query_id: callbackQueryId, text: text || undefined });
}

function deleteMessage(chatId, messageId) {
  return tgCall('deleteMessage', { chat_id: chatId, message_id: messageId });
}

// ---------- Tracking message_id (buat fitur Delete All Chat) ----------
async function trackMessage(chatId, messageId) {
  const supabase = getSupabase();
  await supabase.from('bot_messages').insert({ chat_id: String(chatId), message_id: messageId });
}

async function getTrackedMessages(chatId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('bot_messages').select('message_id').eq('chat_id', String(chatId));
  if (error) throw new Error(error.message);
  return (data || []).map(r => r.message_id);
}

async function clearTrackedMessages(chatId) {
  const supabase = getSupabase();
  const { error } = await supabase.from('bot_messages').delete().eq('chat_id', String(chatId));
  if (error) throw new Error(error.message);
}

// ---------- Keyboard ----------
function buildMenuKeyboard() {
  const rows = [
    [{ text: '📊 Ringkasan Hari Ini', callback_data: 'summary' }],
    [{ text: '🔥 Top Perform', callback_data: 'perform' }, { text: '👻 Ghost Kreator', callback_data: 'ghost' }],
    [{ text: '🔵 Rekomendasi Sampel', callback_data: 'rekomen' }, { text: '⏰ Kontrak Expire', callback_data: 'expiring' }],
    [{ text: '📤 Push File', callback_data: 'push_file_info' }]
  ];
  if (SITE_URL) rows.push([{ text: '🌐 Buka Dashboard', url: SITE_URL }]);
  rows.push([{ text: '🔄 Refresh', callback_data: 'menu' }]);
  rows.push([{ text: '🗑 Delete All Chat', callback_data: 'delete_all_confirm' }]);
  return rows;
}
const BACK_KEYBOARD = SITE_URL
  ? [[{ text: '🌐 Buka Dashboard', url: SITE_URL }], [{ text: '« Menu Utama', callback_data: 'menu' }]]
  : [[{ text: '« Menu Utama', callback_data: 'menu' }]];

// ---------- Akses ----------
function isAuthorized(chatId) {
  return Boolean(GROUP_CHAT_ID) && String(chatId) === String(GROUP_CHAT_ID);
}

// ---------- Ambil & siapkan data dari Supabase (sama seperti loadAllDataFromServer di frontend) ----------
async function loadAllData() {
  const supabase = getSupabase();
  const { data: rawRows, error: rErr } = await supabase.from('creator_rows').select('*');
  if (rErr) throw new Error(rErr.message);

  const appRows = (rawRows || []).map(r => ({
    name: r.name, sampelDiminta: r.sampel_diminta || 0, sampelTerkirim: r.sampel_terkirim || 0,
    videoSampel: r.video_sampel || 0, liveSampel: r.live_sampel || 0, gmv: r.gmv || 0,
    roi45: r.roi45 || 0, roi90: r.roi90 || 0, orders: r.orders || 0, src: r.src || 'sample'
  }));
  const allData = mergeRows(appRows);

  const { data: exclusive, error: eErr } = await supabase.from('exclusive_creators').select('*');
  if (eErr) throw new Error(eErr.message);

  return { allData, exclusive: exclusive || [] };
}

// ---------- Builder tiap menu ----------
async function buildSummary() {
  const { allData } = await loadAllData();
  if (!allData.length) return { text: '📊 *Ringkasan*\n\nBelum ada data yang diupload.', keyboard: BACK_KEYBOARD };
  const tGmv = allData.reduce((a, r) => a + r.gmv, 0);
  const tVideo = allData.reduce((a, r) => a + r.videoSampel, 0);
  const tSampel = allData.reduce((a, r) => a + r.sampelTerkirim, 0);
  const ghostCount = allData.filter(isGhost).length;
  const performCount = allData.filter(r => getStatus(r) === 'perform').length;
  const boncosCount = allData.filter(r => getStatus(r) === 'boncos').length;
  const text = `📊 *Ringkasan Hari Ini*\n\n` +
    `👥 Total Kreator: *${allData.length}*\n` +
    `💰 Total GMV: *${fmtRp(tGmv)}*\n` +
    `📦 Sampel Terkirim: *${tSampel}* pcs\n` +
    `🎬 Video Diposting: *${tVideo}*\n\n` +
    `🔥 Perform: *${performCount}*\n` +
    `❌ Boncos: *${boncosCount}*\n` +
    `👻 Ghost: *${ghostCount}*`;
  return { text, keyboard: BACK_KEYBOARD };
}

async function buildPerform() {
  const { allData } = await loadAllData();
  const top = allData.filter(r => getStatus(r) === 'perform').sort((a, b) => b.gmv - a.gmv).slice(0, 10);
  if (!top.length) return { text: '🔥 *Top Perform*\n\nBelum ada kreator perform.', keyboard: BACK_KEYBOARD };
  const lines = top.map((r, i) => `${i + 1}. [@${r.name}](https://www.tiktok.com/@${r.name}) — ${fmtRp(r.gmv)} (ROI ${r.roi45.toFixed(1)}x)`);
  return { text: `🔥 *Top Perform* (${top.length})\n\n${lines.join('\n')}`, keyboard: BACK_KEYBOARD };
}

async function buildGhost() {
  const { allData } = await loadAllData();
  const ghosts = allData.filter(isGhost);
  if (!ghosts.length) return { text: '👻 *Ghost Kreator*\n\n✅ Tidak ada ghost kreator saat ini!', keyboard: BACK_KEYBOARD };
  const lines = ghosts.slice(0, 15).map((r, i) => `${i + 1}. [@${r.name}](https://www.tiktok.com/@${r.name}) — dapat ${r.sampelTerkirim} sampel, 0 video`);
  const more = ghosts.length > 15 ? `\n\n_+${ghosts.length - 15} kreator ghost lainnya_` : '';
  return { text: `👻 *Ghost Kreator* (${ghosts.length})\n\n${lines.join('\n')}${more}`, keyboard: BACK_KEYBOARD };
}

async function buildRekomen() {
  const { allData } = await loadAllData();
  const rekomen = allData.filter(r => getStatus(r) === 'potential').sort((a, b) => b.gmv - a.gmv).slice(0, 10);
  if (!rekomen.length) return { text: '🔵 *Rekomendasi Kirim Sampel*\n\nBelum ada rekomendasi saat ini.', keyboard: BACK_KEYBOARD };
  const lines = rekomen.map((r, i) => `${i + 1}. [@${r.name}](https://www.tiktok.com/@${r.name}) — GMV organic ${fmtRp(r.gmv)}`);
  return { text: `🔵 *Rekomendasi Kirim Sampel* (${rekomen.length})\n\n${lines.join('\n')}`, keyboard: BACK_KEYBOARD };
}

async function buildExpiring() {
  const { exclusive } = await loadAllData();
  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiring = exclusive.filter(e => e.expire && new Date(e.expire) >= now && new Date(e.expire) <= in7d);
  const expired = exclusive.filter(e => e.expire && new Date(e.expire) < now);
  if (!expiring.length && !expired.length) return { text: '⏰ *Kontrak/VIP*\n\n✅ Tidak ada kontrak yang mau/sudah expire.', keyboard: BACK_KEYBOARD };
  const lines = [];
  if (expired.length) lines.push('*🔴 Sudah Expired:*', ...expired.map(e => `• [@${e.username}](https://www.tiktok.com/@${e.username}) — expired ${e.expire}`), '');
  if (expiring.length) lines.push('*🟡 Mau Expire (≤7 hari):*', ...expiring.map(e => `• [@${e.username}](https://www.tiktok.com/@${e.username}) — expire ${e.expire}`));
  return { text: `⏰ *Kontrak/VIP*\n\n${lines.join('\n')}`, keyboard: BACK_KEYBOARD };
}

function buildPushFileInfo() {
  return {
    text: `📤 *Push File ke Website*\n\n` +
      `Kirim file *.xlsx*, *.xls*, atau *.csv* langsung di chat ini (sebagai dokumen, bukan foto), bot otomatis baca dan simpan datanya ke dashboard.\n\n` +
      `Format file sama seperti yang dipakai di halaman Upload website (kolom Creator name, Sampel terkirim, GMV, dst).\n\n` +
      `⚠️ Format lain (Word, PDF, gambar) belum didukung untuk data kreator.`,
    keyboard: BACK_KEYBOARD
  };
}

function buildDeleteAllConfirm() {
  return {
    text: `🗑 *Hapus Semua Chat?*\n\n` +
      `Ini akan menghapus semua pesan bot ini di grup (yang terkirim sejak fitur ini aktif). Tindakan tidak bisa dibatalkan.\n\n` +
      `Yakin mau lanjut?`,
    keyboard: [
      [{ text: '✅ Ya, hapus semua', callback_data: 'delete_all_execute' }],
      [{ text: '« Batal', callback_data: 'menu' }]
    ]
  };
}

async function buildMenu() {
  return { text: `🤖 *Affiliate Analyzer Bot*\n\nMau lihat apa?`, keyboard: buildMenuKeyboard() };
}

const ROUTES = {
  menu: buildMenu, summary: buildSummary, perform: buildPerform, ghost: buildGhost,
  rekomen: buildRekomen, expiring: buildExpiring,
  push_file_info: async () => buildPushFileInfo(),
  delete_all_confirm: async () => buildDeleteAllConfirm()
};

// ---------- Push File: download dari Telegram, parse, simpan ke Supabase ----------
async function handleIncomingDocument(message) {
  const doc = message.document;
  const fileName = doc.file_name || 'file_tanpa_nama';
  const ext = fileName.toLowerCase().split('.').pop();

  if (!['xlsx', 'xls', 'csv'].includes(ext)) {
    await sendMessage(message.chat.id, `⚠️ Format *.${ext}* belum didukung untuk data kreator. Pakai *.xlsx*, *.xls*, atau *.csv* ya.`, BACK_KEYBOARD);
    return;
  }
  if (doc.file_size && doc.file_size > 10 * 1024 * 1024) {
    await sendMessage(message.chat.id, `⚠️ File terlalu besar (maks 10MB).`, BACK_KEYBOARD);
    return;
  }

  await sendMessage(message.chat.id, `⏳ Memproses *${fileName}*...`);

  try {
    // 1. Minta info file (termasuk file_path) dari Telegram
    const fileInfo = await tgCall('getFile', { file_id: doc.file_id });
    if (!fileInfo.ok) throw new Error(fileInfo.description || 'Gagal ambil info file dari Telegram');

    // 2. Download isi file dari server Telegram
    const fileRes = await fetch(`${TG_FILE_API}/${fileInfo.result.file_path}`);
    if (!fileRes.ok) throw new Error('Gagal download file dari Telegram');
    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Parse pakai logic yang sama dengan upload web (api/_file-parser.js)
    const parsed = parseFileBuffer(buffer, fileName);
    if (parsed.error) {
      const errMap = {
        no_recognizable_data: 'Tidak ada data kreator yang bisa dikenali di file ini. Pastikan kolom sesuai format (Creator name, Sampel terkirim, GMV, dst).',
        parse_failed: 'Gagal membaca isi file, kemungkinan file rusak atau corrupt.'
      };
      const reason = errMap[parsed.error.split(':')[0]] || parsed.error;
      await sendMessage(message.chat.id, `❌ Gagal proses *${fileName}*: ${reason}`, BACK_KEYBOARD);
      return;
    }

    // 4. Simpan tiap sheet ke Supabase (sama seperti api/files.js POST)
    const supabase = getSupabase();
    let totalRows = 0;
    for (const sheet of parsed.sheets) {
      if (sheet.rows.length > 5000) {
        await sendMessage(message.chat.id, `⚠️ Sheet "${sheet.sheetName}" punya >5000 baris, dilewati (batas maksimal 5000 baris per file).`);
        continue;
      }
      const { data: fileRow, error: fErr } = await supabase
        .from('uploaded_files')
        .insert({ file_name: fileName.slice(0, 255), file_type: sheet.type, row_count: sheet.rows.length })
        .select()
        .single();
      if (fErr) throw new Error(fErr.message);

      const payload = sheet.rows.map(r => ({
        file_id: fileRow.id,
        name: String(r.name || '').slice(0, 200),
        sampel_diminta: Number(r.sampelDiminta) || 0,
        sampel_terkirim: Number(r.sampelTerkirim) || 0,
        video_sampel: Number(r.videoSampel) || 0,
        live_sampel: Number(r.liveSampel) || 0,
        gmv: Number(r.gmv) || 0,
        roi45: Number(r.roi45) || 0,
        roi90: Number(r.roi90) || 0,
        orders: Number(r.orders) || 0,
        komisi: Number(r.komisi) || 0,
        refund: Number(r.refund) || 0,
        aov: Number(r.aov) || 0,
        src: r.src === 'transaction' ? 'transaction' : 'sample'
      }));
      const { error: rErr } = await supabase.from('creator_rows').insert(payload);
      if (rErr) throw new Error(rErr.message);
      totalRows += sheet.rows.length;
    }

    await sendMessage(
      message.chat.id,
      `✅ *${fileName}* berhasil disimpan!\n\n👥 ${totalRows} kreator masuk ke dashboard.`,
      BACK_KEYBOARD
    );
  } catch (err) {
    console.error('Push file error:', err);
    await sendMessage(message.chat.id, `❌ Gagal proses *${fileName}*: ${err.message}`, BACK_KEYBOARD);
  }
}

// ---------- Delete All Chat: hapus semua pesan yang ter-track di chat ini ----------
async function handleDeleteAllExecute(chatId) {
  let messageIds;
  try {
    messageIds = await getTrackedMessages(chatId);
  } catch (err) {
    await sendMessage(chatId, `❌ Gagal ambil daftar pesan: ${err.message}`, BACK_KEYBOARD);
    return;
  }

  if (!messageIds.length) {
    await sendMessage(chatId, `✅ Tidak ada pesan ter-track untuk dihapus.`, BACK_KEYBOARD);
    return;
  }

  let deleted = 0, failed = 0;
  for (const id of messageIds) {
    try {
      const r = await deleteMessage(chatId, id);
      if (r && r.ok) deleted++; else failed++;
    } catch (e) {
      failed++;
    }
  }

  try { await clearTrackedMessages(chatId); } catch (e) { /* abaikan, tabel akan keisi ulang seiring waktu */ }

  // Pesan konfirmasi terakhir ini sengaja TIDAK di-track, biar tidak ikut numpuk lagi.
  await tgCall('sendMessage', {
    chat_id: chatId,
    text: `🧹 Selesai. ${deleted} pesan terhapus${failed ? `, ${failed} gagal (kemungkinan sudah lama/sudah terhapus manual)` : ''}.`
  });
}

// ---------- Handler utama ----------
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true }); // Telegram cuma POST, GET buat cek hidup aja

  if (!BOT_TOKEN || !GROUP_CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN atau TELEGRAM_GROUP_CHAT_ID belum diset');
    return res.status(200).json({ ok: true }); // tetap 200 ke Telegram supaya tidak retry terus
  }

  try {
    const update = req.body || {};
    const incomingChatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;
    if (!incomingChatId) return res.status(200).json({ ok: true });

    if (!isAuthorized(incomingChatId)) {
      return res.status(200).json({ ok: true }); // diam-diam ignore, jangan kasih tahu apapun ke pengirim asing
    }

    // ---------- Klik inline button ----------
    if (update.callback_query) {
      const cq = update.callback_query;
      const action = cq.data;
      answerCallback(cq.id).catch(() => {}); // ack cepat biar tombol tidak "loading" lama di UI Telegram

      if (action === 'delete_all_execute') {
        await editMessage(cq.message.chat.id, cq.message.message_id, '🧹 Menghapus semua pesan...');
        await handleDeleteAllExecute(cq.message.chat.id);
        return res.status(200).json({ ok: true });
      }

      const builder = ROUTES[action] || ROUTES.menu;
      try {
        const { text, keyboard } = await builder();
        await editMessage(cq.message.chat.id, cq.message.message_id, text, keyboard);
      } catch (err) {
        await editMessage(cq.message.chat.id, cq.message.message_id, `⚠️ Gagal ambil data: ${err.message}`, BACK_KEYBOARD);
      }
      return res.status(200).json({ ok: true });
    }

    // ---------- Pesan masuk ----------
    if (update.message) {
      const message = update.message;

      // Track pesan masuk juga (biar Delete All Chat ikut bersihin pesan dari user, bukan cuma dari bot)
      if (message.message_id) trackMessage(message.chat.id, message.message_id).catch(() => {});

      // Dokumen (xlsx/xls/csv) -> proses sebagai push file
      if (message.document) {
        await handleIncomingDocument(message);
        return res.status(200).json({ ok: true });
      }

      // Default: pesan teks apapun (termasuk /start) -> tampilkan menu
      const { text: menuText, keyboard } = await buildMenu();
      await sendMessage(message.chat.id, menuText, keyboard);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).json({ ok: true }); // selalu 200 ke Telegram, error di-log aja di Vercel
  }
};
