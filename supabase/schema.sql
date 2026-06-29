-- ============================================================
-- AFFILIATE ANALYZER SKINKU — SUPABASE SCHEMA
-- ============================================================
-- Cara pakai: copy-paste seluruh isi file ini ke
-- Supabase Dashboard → SQL Editor → New Query → Run
--
-- Ini single-workspace (1 admin/tim), jadi TIDAK ada konsep
-- multi-user/multi-tenant. Semua data dibaca/ditulis lewat
-- serverless functions di /api/*.js yang pakai service_role key,
-- jadi RLS (Row Level Security) sengaja dimatikan karena akses
-- publik langsung dari browser ke Supabase tidak pernah terjadi.
-- ============================================================

-- Pastikan gen_random_uuid() tersedia (biasanya sudah aktif default di Supabase,
-- baris ini cuma pengaman kalau ternyata belum).
create extension if not exists pgcrypto;

-- ============ 1. UPLOADED_FILES ============
-- Satu baris = satu file Excel yang pernah diupload.
-- Dipakai untuk: nampilin daftar file, dan buat fitur hapus file individual
-- (hapus row di sini akan ikut hapus semua creator_rows terkait via CASCADE).
create table if not exists uploaded_files (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  file_type text not null check (file_type in ('sample','transaction','unknown')),
  row_count integer not null default 0,
  uploaded_at timestamptz not null default now()
);

-- ============ 2. CREATOR_ROWS ============
-- Satu baris = satu kreator dari satu file upload (BELUM di-merge).
-- Menyimpan history per-upload, jadi grafik trend (GMV/video/sample dari waktu ke waktu) bisa dibuat.
create table if not exists creator_rows (
  id uuid primary key default gen_random_uuid(),
  file_id uuid references uploaded_files(id) on delete cascade,
  name text not null,
  sampel_diminta integer not null default 0,
  sampel_terkirim integer not null default 0,
  video_sampel integer not null default 0,
  live_sampel integer not null default 0,
  gmv bigint not null default 0,
  roi45 numeric not null default 0,
  roi90 numeric not null default 0,
  orders integer not null default 0,
  komisi bigint not null default 0,
  refund bigint not null default 0,
  aov bigint not null default 0,
  src text not null default 'sample' check (src in ('sample','transaction')),
  created_at timestamptz not null default now()
);

create index if not exists idx_creator_rows_file_id on creator_rows(file_id);
create index if not exists idx_creator_rows_name on creator_rows(name);
create index if not exists idx_creator_rows_created_at on creator_rows(created_at);

-- ============ 3. EXCLUSIVE_CREATORS ============
-- "Kolam" kreator VIP & kontrak langsung (pindahan dari localStorage).
create table if not exists exclusive_creators (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  nama text default '',
  tipe text not null default 'vip' check (tipe in ('vip','contract','both')),
  komisi text default '',
  platform text not null default 'tiktok' check (platform in ('tiktok','instagram','youtube','multi')),
  followers text default '',
  tanggal date,
  expire date,
  produk jsonb not null default '[]'::jsonb,
  notes text default '',
  added_at timestamptz not null default now()
);

-- ============ 4. BOT_USERS ============
-- Whitelist Chat ID Telegram yang boleh akses bot. Selain TELEGRAM_CHAT_ID (owner,
-- diset lewat Environment Variable Vercel), siapapun di tabel ini juga bisa pakai
-- semua menu bot (full akses, sama seperti owner) — TAPI cuma owner yang dapat
-- menu/info tambahan khusus (lihat is_owner di api/telegram-webhook.js).
-- Dikelola dari menu "👑 Owner Panel" di bot (cuma owner yang bisa tambah/hapus).
create table if not exists bot_users (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null unique,
  display_name text default '',
  added_at timestamptz not null default now()
);

-- ============ RLS ============
-- Dimatikan: semua akses lewat serverless function (service_role key),
-- tidak ada akses langsung dari browser ke Supabase.
alter table uploaded_files disable row level security;
alter table creator_rows disable row level security;
alter table exclusive_creators disable row level security;
alter table bot_users disable row level security;
