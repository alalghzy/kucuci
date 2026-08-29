-- KuCuci — D1 migration: tabel settings (nomor WA admin, dst)
-- Jalankan: npx wrangler d1 execute kucuci-db --remote --file=./migrations/003_settings.sql

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

-- Nilai awal: nomor WA admin (ambil placeholder; nanti di-edit via halaman Profil)
INSERT OR IGNORE INTO settings (key, value) VALUES ('wa_number', '6281234567890');