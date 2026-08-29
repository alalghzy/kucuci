-- KuCuci — D1 migration: notifikasi per-user + status dibaca / tipe
-- Jalankan: npx wrangler d1 execute kucuci-db --remote --file=./migrations/006_notif_user.sql

ALTER TABLE notifications ADD COLUMN user_email TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN read_at TEXT DEFAULT '';
ALTER TABLE notifications ADD COLUMN type TEXT DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN order_id TEXT DEFAULT '';