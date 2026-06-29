# Affiliate Analyzer v2 — SKINKU
Deploy guide + setup Telegram OTP + Supabase

---

## STRUKTUR FILE
File sudah dipisah per bagian (HTML / CSS / JS) supaya lebih rapi dan mudah dicari kalau mau edit:
```
affiliate-v2/
├── index.html              ← Struktur halaman (HTML murni, tinggal link ke css/js)
├── css/
│   └── style.css           ← Semua styling
├── js/
│   ├── state.js            ← Variabel global & konstanta
│   ├── tiktok.js           ← Helper link otomatis ke profil TikTok kreator
│   ├── utils.js            ← Format angka/rupiah, parsing data, status & saran kreator
│   ├── api-client.js       ← Layer komunikasi ke backend (/api/files, /api/exclusive)
│   ├── notifications.js    ← 🆕 Badge alert sidebar, toast notification, animasi angka KPI
│   ├── auth.js             ← Login & OTP Telegram
│   ├── upload.js           ← Proses file Excel + simpan/sync ke Supabase
│   ├── dashboard.js        ← KPI grid + tabel Top Perform/Ghost/Rekomendasi
│   ├── creator-table.js    ← Tabel utama "Kreator List"
│   ├── exclusive.js        ← "Kolam" Affiliate Exclusive (VIP/Kontrak)
│   ├── charts.js           ← Grafik GMV, sampel vs video, trend per file upload
│   ├── ai-chat.js          ← AI Analyst (chat OpenAI)
│   ├── settings.js         ← Settings (API key, parameter analisis)
│   ├── nav.js               ← Navigasi sidebar, export CSV, hapus file
│   └── app.js              ← Pasang event listener & jalankan app (di-load terakhir)
├── api/
│   ├── _supabase.js          ← Helper koneksi Supabase (server-side only, pakai service_role key)
│   ├── _creator-logic.js     ← Logic status/saran kreator versi server (dipakai bot Telegram)
│   ├── files.js              ← CRUD file upload + creator_rows (list/simpan/hapus per file)
│   ├── exclusive.js          ← CRUD kolam kreator Affiliate Exclusive
│   ├── telegram-webhook.js   ← Bot Telegram 2-arah + whitelist akses + Owner Panel
│   ├── setup-webhook.js      ← Endpoint sekali-pakai buat daftarkan webhook ke Telegram
│   ├── cron-daily-summary.js ← 🆕 Notifikasi harian otomatis (dipanggil Vercel Cron jam 9 pagi WIB)
│   ├── send-otp.js           ← Serverless: kirim OTP via Telegram
│   └── verify-otp.js         ← Serverless: verifikasi OTP
├── supabase/
│   └── schema.sql          ← SQL buat bikin semua tabel di Supabase (copy-paste sekali aja)
├── package.json             ← Dependency @supabase/supabase-js
└── vercel.json              ← Config Vercel
```
File JS di-load berurutan sesuai dependency-nya (state dulu, baru utils, baru fitur-fitur yang butuh utils, dst). Kalau mau nambah fitur baru, biasanya tinggal taruh di file yang paling relevan atau bikin file baru lalu daftarin di `<script>` tag paling bawah `index.html`.

---

## 🆕 DATA TERSIMPAN PERMANEN (Supabase)
Semua data (file upload, data kreator, kolam Affiliate Exclusive) sekarang disimpan di database Supabase — **TIDAK** hilang lagi kalau halaman di-refresh, pindah tab, ganti browser, atau ganti device. Sebelumnya data cuma di memory browser/localStorage; sekarang setiap upload langsung tersimpan ke server lewat `/api/files` dan `/api/exclusive`.

Cara kerja singkatnya:
- Saat upload Excel → data dikirim ke `/api/files` (POST) → tersimpan di tabel `uploaded_files` + `creator_rows`
- Saat buka/refresh halaman → `loadAllDataFromServer()` otomatis fetch semua data dari server
- Tombol ✕ di setiap chip file → hapus file itu beserta semua data kreatornya (lewat `/api/files` DELETE), file lain tidak terpengaruh
- Tombol "🗑 Reset" di topbar sekarang artinya **sync ulang** dari server (bukan hapus data) — kalau emang mau hapus permanen, hapus per-file lewat tombol ✕ di masing-masing chip

**Wajib setup Supabase dulu sebelum deploy** — lihat STEP 0 di bawah.

---

## 🆕 GRAFIK PERFORMA
Di Dashboard, sekarang ada 3 grafik (pakai Chart.js):
1. **Top 10 GMV per Kreator** — bar chart, biar gampang lihat siapa yang paling menghasilkan
2. **Sampel vs Video per Kreator** — bar chart 3 series (Diminta/Terkirim/Video), biar gampang lihat siapa yang banyak dikirim sampel tapi nggak posting
3. **Trend per File Upload** — line chart GMV/Video/Sampel Diminta diurutkan dari file pertama sampai terakhir yang diupload, jadi kelihatan growth/decline dari waktu ke waktu

Grafik ke-3 butuh minimal 2 file yang sudah diupload di waktu yang berbeda biar ada garis trend-nya. Logic-nya di `js/charts.js`.

---

## 🆕 LINK OTOMATIS KE TIKTOK
Nama/username kreator sekarang otomatis jadi link yang langsung membuka profil TikTok-nya di tab baru. Ini berlaku di 3 tempat:
- **Kreator List** — kolom "Kreator" di tabel utama
- **Dashboard** — widget Top Perform, Ghost Kreator, dan Rekomendasi Kirim Sampel
- **Affiliate Exclusive** — nama kreator di setiap kartu kolam kreator VIP/Kontrak

Logic-nya ada di `js/tiktok.js` (fungsi `renderCreatorLink`). Username dibersihkan dulu dari karakter `@`, spasi, atau simbol aneh dari hasil export Excel sebelum dipakai sebagai URL, jadi link-nya selalu valid: `https://www.tiktok.com/@username`.

---

## 🆕 BOT TELEGRAM INTERAKTIF
Bot Telegram lo sekarang bisa lebih dari kirim OTP doang — bisa ditanya langsung dan jawab pakai data dari Supabase, lewat tombol (nggak perlu ketik command), dan bisa dipakai lebih dari 1 orang.

**Cara pakai:** buka chat bot, ketik apa aja (atau `/start`) → muncul menu dengan tombol:
- **📊 Ringkasan Hari Ini** — total kreator, GMV, sampel terkirim, video, jumlah perform/boncos/ghost
- **🔥 Top Perform** — 10 kreator GMV tertinggi yang statusnya perform, lengkap dengan link TikTok & ROI
- **👻 Ghost Kreator** — kreator yang dapat sampel tapi 0 video, 0 GMV
- **🔵 Rekomendasi Sampel** — kreator dengan GMV organic yang worth dikirim sampel
- **⏰ Kontrak Expire** — kreator VIP/Kontrak di Affiliate Exclusive yang sudah/akan expire dalam 7 hari
- **🌐 Buka Dashboard** — tombol yang langsung buka website (kalau `SITE_URL` sudah diset, lihat STEP 3)
- **🔄 Refresh** — balik ke menu utama

Semua data diambil real-time dari Supabase setiap tombol diklik — jadi selalu sinkron dengan apa yang ada di website.

### Siapa yang boleh akses bot?
Bot ini **bukan bot publik** — cuma 2 jenis orang yang boleh pakai:
1. **Owner** — `TELEGRAM_CHAT_ID` yang diset di Environment Variable Vercel (itu lo)
2. **Whitelist** — siapapun yang ditambahkan owner lewat **Owner Panel** di bot, tersimpan di tabel `bot_users` di Supabase

Orang di whitelist dapat **akses penuh** ke semua menu data (sama seperti owner) — bedanya cuma menu **👑 Owner Panel** yang cuma kelihatan & bisa diakses kalau owner yang chat. Chat dari Chat ID yang tidak ada di keduanya akan **diam-diam di-ignore** (bot tidak balas apa-apa).

### Cara nambah/hapus orang yang boleh akses (cuma owner yang bisa)
1. Di bot, klik tombol **👑 Owner Panel** (cuma muncul kalau lo yang chat)
2. **Nambah orang:** kirim pesan `/adduser <chat_id> <nama>` — contoh: `/adduser 123456789 Budi`. Chat ID orang itu bisa didapat lewat **@userinfobot** di Telegram (sama seperti cara lo dapat Chat ID lo sendiri di STEP 1)
3. **Hapus orang:** kirim pesan `/removeuser <chat_id>`
4. Klik **👥 Lihat Daftar User** buat lihat siapa aja yang sudah punya akses

### Setup webhook (WAJIB, sekali aja)
Bot butuh "webhook" supaya bisa nerima & balas pesan secara real-time. Cara daftarinnya:
1. Pastikan sudah deploy dan `TELEGRAM_BOT_TOKEN` sudah diset di Vercel (lihat STEP 1 & 3)
2. Buka di browser: `https://nama-domain-vercel-lo.vercel.app/api/setup-webhook`
3. Kalau berhasil, muncul JSON `{"success": true, ...}` — webhook langsung aktif
4. Buka chat bot lo di Telegram, ketik `/start` → menu tombol langsung muncul

Endpoint ini cuma perlu dibuka **sekali** (kecuali nanti ganti domain Vercel, baru perlu buka ulang). Logic bot-nya ada di `api/telegram-webhook.js`, dan rumus status/saran kreator versi server di `api/_creator-logic.js` (port dari `js/utils.js` biar hasilnya konsisten sama website).

> Catatan: parameter ROI minimum buat "perform" (`roiPerform`) di bot pakai default `3` (sama seperti default di Settings website). Kalau lo ubah angka ini di Settings website, bot belum otomatis ikut berubah karena setting itu masih tersimpan di localStorage browser, bukan di Supabase — kalau dibutuhkan, ini bisa jadi pengembangan lanjutan.

---

## 🆕 NOTIFIKASI HARIAN OTOMATIS
Tiap hari jam **09:00 WIB**, bot otomatis kirim ringkasan ke **semua orang** yang punya akses (owner + whitelist) — tanpa perlu buka bot manual. Isinya:
- Ringkasan singkat (total kreator, GMV, sampel, video, perform/boncos/ghost)
- Daftar ghost kreator yang perlu dicek (kalau ada)
- Status kontrak/VIP yang sudah/akan expire (kalau ada)

Kalau belum ada data sama sekali yang diupload, notifikasi otomatis **tidak dikirim** (supaya tidak spam pesan kosong).

Dijadwalkan lewat **Vercel Cron** di `vercel.json` (`"schedule": "0 2 * * *"` — 02:00 UTC = 09:00 WIB), memanggil `api/cron-daily-summary.js`. Kalau mau ganti jam, edit baris `schedule` itu pakai format [cron syntax](https://crontab.guru) (ingat: Vercel pakai UTC, WIB = UTC+7).

> ⚠️ Vercel Cron Jobs di paket **Hobby (gratis)** kadang hanya jalan 1x/hari dengan akurasi waktu yang fleksibel (bisa lebih lambat beberapa menit/jam dari yang dijadwalkan). Untuk presisi jam yang ketat, perlu paket **Pro**.

### Keamanan endpoint cron (opsional tapi disarankan)
Endpoint `/api/cron-daily-summary` bisa dipanggil siapa saja kalau URL-nya ketahuan (karena ini bukan webhook Telegram yang aman secara default). Buat nutup ini:
1. Set Environment Variable baru di Vercel: `CRON_SECRET` (isi bebas, contoh: string random panjang)
2. Vercel otomatis mengirim header `Authorization: Bearer <CRON_SECRET>` itu setiap kali Cron Job jalan — endpoint akan menolak request yang tidak punya header yang cocok

---

## 🆕 UI LEBIH HIDUP
Beberapa polish visual & micro-interaction biar pakai website-nya lebih enak:
- **Badge alert merah** di sidebar "Dashboard" — otomatis muncul & nyala/pulse kalau ada ghost kreator atau kontrak VIP/Kontrak yang mau/sudah expire (≤7 hari). Sinkron secara konsep dengan apa yang bot Telegram kasih tau di menu "Ghost Kreator" & "Kontrak Expire"
- **Toast notification** — pengganti `alert()` browser yang kaku. Muncul di pojok kanan bawah, hijau untuk sukses, merah untuk error, hilang otomatis setelah ±3 detik
- **Angka KPI animasi naik** — di Dashboard, semua angka (GMV, sampel, video, dst) animasi dari 0 ke nilai aslinya setiap kali data berubah
- **Micro-interactions** — tombol "menyusut" sedikit saat diklik, nav item sedikit geser saat di-hover, baris tabel & kartu exclusive punya hover effect yang lebih halus

Logic-nya ada di `js/notifications.js` (fungsi `updateAlertBadge`, `toast`, `animateNumber`), CSS-nya di bagian akhir `css/style.css`.

---

## STEP 0 — Setup Supabase (WAJIB, sebelum deploy)

1. Buka [supabase.com](https://supabase.com) → buat project baru (atau pakai yang sudah ada)
2. Buka **SQL Editor** di sidebar Supabase → New Query
3. Copy-paste seluruh isi file `supabase/schema.sql` → klik **Run**. Ini bikin 4 tabel: `uploaded_files`, `creator_rows`, `exclusive_creators`, `bot_users` (whitelist akses bot Telegram)
4. Buka **Settings → API** di Supabase Dashboard, catat 2 hal ini:
   - **Project URL** (contoh: `https://xxxxx.supabase.co`)
   - **service_role key** (di bagian "Project API keys" — **BUKAN** yang `anon`/`public`)

⚠️ **PENTING soal `service_role key`:** kunci ini setara password master ke seluruh database. Jangan pernah ditaruh di kode frontend (index.html/css/js yang jalan di browser) — cuma boleh dipakai sebagai Environment Variable di server (Vercel), karena cuma dibaca oleh file di folder `api/` yang jalan di server, bukan di browser pengunjung.

---

## STEP 1 — Setup Telegram Bot

1. Buka Telegram, cari **@BotFather**
2. Ketik `/newbot` → ikuti instruksi → copy **BOT TOKEN** (format: `123456:ABC-DEF...`)
3. Start bot lo (buka chat dengan bot, klik Start)
4. Cari **@userinfobot** di Telegram → start → copy **Chat ID** lo (angka, misal: `123456789`)

---

## STEP 2 — Deploy ke Vercel

### Via GitHub (Recommended — auto update)
```bash
# 1. Buat repo di github.com, upload semua file
# 2. Buka vercel.com → New Project → Import dari GitHub
# 3. Pilih repo → Deploy
```

### Via CLI
```bash
npm i -g vercel
cd affiliate-v2
vercel
```

### Via Drag & Drop
Drag folder `affiliate-v2` ke vercel.com/new

---

## STEP 3 — Set Environment Variables di Vercel

Setelah deploy, buka: **Vercel Dashboard → Project → Settings → Environment Variables**

Tambahkan:
| Key | Value |
|-----|-------|
| `TELEGRAM_BOT_TOKEN` | Token dari BotFather |
| `TELEGRAM_CHAT_ID` | Chat ID lo dari @userinfobot (ini jadi Chat ID **owner**) |
| `SUPABASE_URL` | Project URL dari Supabase (STEP 0) |
| `SUPABASE_SERVICE_KEY` | service_role key dari Supabase (STEP 0) — **jangan** pakai anon key |
| `SITE_URL` | URL website lo, contoh: `https://affiliate-skinku.vercel.app` (buat tombol "🌐 Buka Dashboard" di bot) |
| `CRON_SECRET` | *(opsional tapi disarankan)* String random apapun, buat lindungi endpoint notifikasi harian — lihat "🆕 NOTIFIKASI HARIAN OTOMATIS" |

Setelah set → klik **Redeploy** supaya env variables aktif.

⚠️ Setelah redeploy, jangan lupa buka `https://nama-domain-vercel-lo.vercel.app/api/setup-webhook` **sekali** buat ngaktifin bot Telegram interaktif (lihat bagian "🆕 BOT TELEGRAM INTERAKTIF" di atas).

---

## STEP 4 — Setup OpenAI (untuk AI Analyst)

1. Buka website → klik **Settings** di sidebar
2. Masukkan OpenAI API Key (`sk-...`)
3. Pilih model: GPT-4o Mini direkomendasikan
4. Done — AI Analyst langsung aktif

---

## CARA PAKAI

### Login
- Buka website → klik "Kirim OTP ke Telegram"
- Cek Telegram → masukkan 6 digit OTP
- Login berhasil — session disimpan di browser

### Upload Data
- Drag file Excel dari TikTok Seller Affiliate
- Bisa multi-file sekaligus (Sample Analysis + Transaction Analysis)
- Tiap file otomatis tersimpan ke Supabase begitu selesai diproses — aman walau halaman ditutup/refresh
- Mau hapus 1 file? Klik tombol ✕ di chip file-nya (di tab Upload Data) — data kreator dari file itu ikut terhapus, file lain tidak terpengaruh

### Affiliate Exclusive
- Sidebar → "Affiliate Exclusive"
- Tambah kreator VIP atau kontrak langsung
- Isi: username, tipe (VIP/Kontrak/Both), komisi %, produk, notes
- Data tersimpan permanen di Supabase (bukan cuma di browser) — bisa diakses dari device manapun selama login pakai OTP yang sama

### Grafik Performa
- Otomatis muncul di Dashboard setelah ada data
- "Trend per File Upload" baru ada garisnya kalau sudah upload ≥2 file

### AI Analyst — 2 Mode
- **📊 Analisis Data**: tanya performa kreator, siapa perform, boncos, dll
- **⚡ Update Website**: minta AI update fitur/tampilan → AI generate kode → download → replace file

### Export CSV
- Klik "Export CSV" di sidebar → download semua data + saran sistem

---

## UPDATE WEBSITE VIA AI

Di halaman AI Analyst, switch ke mode "⚡ Update Website" lalu ketik request, contoh:
- "Tambahkan kolom followers di kreator list"
- "Ubah warna tema jadi ungu"  
- "Tambahkan grafik performa GMV per file yang diupload"

AI akan generate kode → ada tombol "⬇ Download kode" → tinggal lihat kode-nya cocok masuk ke file mana (misal kalau soal tampilan tabel kreator, taruh di `js/creator-table.js`; kalau soal styling, taruh di `css/style.css`) lalu replace bagian yang relevan di file itu. Karena sekarang filenya sudah dipisah per bagian, biasanya lebih mudah nemu di mana harus diubah dibanding dulu pas masih 1 file gede.

---

## TROUBLESHOOTING

**OTP tidak terkirim:**
- Pastikan env variables sudah diset di Vercel dan sudah Redeploy
- Pastikan sudah `/start` di bot Telegram lo
- Cek TELEGRAM_CHAT_ID benar (dari @userinfobot)

**AI tidak bisa:**
- Pastikan API Key format `sk-...` dan valid
- Cek quota OpenAI akun lo

**Data tidak muncul:**
- Pastikan file Excel dari TikTok Seller (bukan format lain)
- Coba refresh dan upload ulang

**Data hilang / gagal sync (muncul "⚠️ Gagal sync"):**
- Pastikan `SUPABASE_URL` dan `SUPABASE_SERVICE_KEY` sudah diset di Environment Variables Vercel, lalu **Redeploy**
- Pastikan SQL di `supabase/schema.sql` sudah pernah dijalankan di Supabase SQL Editor (cek tab "Table Editor" di Supabase, harus ada 3 tabel: `uploaded_files`, `creator_rows`, `exclusive_creators`)
- Cek di Supabase Dashboard apakah project masih aktif (project gratis Supabase bisa auto-pause kalau tidak dipakai lama)

**Bot Telegram tidak respon / tombol tidak muncul:**
- Pastikan sudah buka `/api/setup-webhook` minimal sekali setelah deploy/redeploy terakhir
- Buka `/api/setup-webhook` lagi — kalau hasilnya `{"success": true}`, webhook sudah aktif, coba `/start` ulang di bot
- Kalau hasilnya error, baca pesan `detail`-nya — biasanya soal `TELEGRAM_BOT_TOKEN` yang salah/belum diset
- Bot cuma respon ke `TELEGRAM_CHAT_ID` (owner) atau Chat ID yang ada di tabel `bot_users` (whitelist) — chat dari Chat ID lain, bot diam saja (ini disengaja, bukan bug)
- Cek **Vercel Dashboard → Project → Logs** buat lihat error detail kalau masih nggak jalan

**Tombol "👑 Owner Panel" tidak muncul:**
- Pastikan yang chat itu Chat ID yang sama persis dengan `TELEGRAM_CHAT_ID` di Environment Variable Vercel
- Cek lagi Chat ID lo lewat @userinfobot, kadang ketukar sama Chat ID grup/channel

**Orang yang sudah di-`/adduser` masih tidak bisa akses:**
- Pastikan Chat ID yang dimasukkan benar (angka doang, tanpa spasi/karakter lain) — minta orang itu cek Chat ID-nya sendiri lewat @userinfobot
- Cek lewat tombol "👥 Lihat Daftar User" di Owner Panel buat pastikan Chat ID-nya benar-benar tersimpan
- Orang itu harus sudah pernah `/start` bot-nya sendiri minimal sekali (Telegram tidak bisa kirim pesan ke orang yang belum pernah memulai chat dengan bot)

**Notifikasi harian jam 9 pagi tidak muncul:**
- Vercel Cron di paket **Hobby (gratis)** kadang telat beberapa menit dari jadwal — ini normal, bukan bug
- Cek **Vercel Dashboard → Project → Cron Jobs** buat lihat riwayat eksekusi & error-nya
- Pastikan minimal sudah ada 1 file yang diupload — kalau belum ada data sama sekali, notifikasi memang sengaja tidak dikirim
- Kalau pakai `CRON_SECRET`, pastikan tidak ada typo antara yang di Environment Variable Vercel dengan ekspektasi kode (endpoint ini dipanggil otomatis oleh Vercel, jadi seharusnya selalu cocok asal env var sudah diset sebelum deploy terakhir)
