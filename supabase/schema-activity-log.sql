-- Jalankan sekali di Supabase SQL Editor buat fitur "🕵️ Activity Log" (Settings).
-- Nggak akan mengubah/menghapus tabel yang sudah ada.

create table if not exists activity_log (
  id          bigint generated always as identity primary key,
  action      text not null,          -- upload_file, delete_file, add_exclusive, update_exclusive,
                                       -- delete_exclusive, login_success, login_failed, otp_requested,
                                       -- logout, page_view, resync_data
  detail      text,                   -- info tambahan, misal nama file / username kreator
  ip          text,
  os          text,
  browser     text,
  device_type text,                   -- Mobile / Tablet / Desktop
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_activity_log_created_at on activity_log (created_at desc);
create index if not exists idx_activity_log_action on activity_log (action);

-- Opsional tapi disarankan: auto-hapus log yang lebih tua dari 90 hari biar tabel
-- nggak numpuk terus-terusan. Kalau Supabase project-mu ada pg_cron, aktifkan ini:
--
-- select cron.schedule(
--   'cleanup-activity-log',
--   '0 3 * * *', -- tiap jam 3 pagi
--   $$ delete from activity_log where created_at < now() - interval '90 days' $$
-- );
