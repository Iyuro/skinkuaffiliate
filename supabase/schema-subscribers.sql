-- Tambahan tabel untuk menyimpan langganan Telegram
create table if not exists telegram_subscribers (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null unique,
  username text,
  subscribed boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_telegram_subscribers_chat_id on telegram_subscribers(chat_id);