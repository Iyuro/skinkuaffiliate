-- supabase/schema-bot-messages.sql
-- Tabel buat track message_id yang dikirim/diterima bot di tiap chat Telegram,
-- supaya fitur "Delete All Chat" bisa hapus pesan-pesan itu satu-satu lewat
-- Telegram Bot API (Telegram tidak punya endpoint "hapus semua sekaligus").
--
-- Jalankan SQL ini sekali di Supabase SQL Editor sebelum fitur Delete All Chat
-- / Push File dipakai.

create table if not exists bot_messages (
  id bigint generated always as identity primary key,
  chat_id text not null,
  message_id bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bot_messages_chat_id on bot_messages (chat_id);

-- Catatan: tabel ini otomatis dikosongkan tiap kali tombol "Delete All Chat" selesai
-- dieksekusi (lihat clearTrackedMessages di api/telegram-webhook.js), jadi tidak perlu
-- maintenance manual. Kalau mau hapus histori lama secara berkala, bisa tambahkan
-- cron job terpisah, tapi untuk sekarang tidak wajib.
