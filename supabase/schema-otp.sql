-- Tambahan tabel untuk menyimpan OTP login Telegram
create table if not exists telegram_login_otps (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  used boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_telegram_login_otps_code on telegram_login_otps(code);
create index if not exists idx_telegram_login_otps_used on telegram_login_otps(used);