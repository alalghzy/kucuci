-- KuCuci — D1 migration: tabel addresses (banyak alamat per user)
-- Jalankan: npx wrangler d1 execute kucuci-db --remote --file=./migrations/002_addresses.sql

CREATE TABLE IF NOT EXISTS addresses (
  id         TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  label      TEXT NOT NULL DEFAULT '',
  address    TEXT NOT NULL DEFAULT '',
  lat        REAL,
  lng        REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_email ON addresses(user_email);