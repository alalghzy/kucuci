-- KuCuci — seed data awal (5 layanan + 1 notifikasi selamat datang)
-- Jalankan: npx wrangler d1 execute kucuci-db --remote --file=./migrations/seed.sql

INSERT OR IGNORE INTO services (id, name, slug, description, price, unit, icon_name, is_active, created_at) VALUES
  ('srv-cuci-setrika', 'Cuci & Setrika', 'cuci-setrika', 'Cuci bersih + setrika rapi', 7000, 'Kg', 'washer', 1, datetime('now')),
  ('srv-cuci-kering', 'Cuci Kering', 'cuci-kering', 'Cuci + kering tanpa setrika', 5000, 'Kg', 'shirt', 1, datetime('now')),
  ('srv-setrika-saja', 'Setrika Saja', 'setrika-saja', 'Setrika pakaian yang sudah kering', 4000, 'Kg', 'iron', 1, datetime('now')),
  ('srv-bed-cover', 'Bed Cover', 'bed-cover', 'Cuci & setrika bed cover/boneka', 15000, 'Pc', 'bed', 1, datetime('now')),
  ('srv-sepatu', 'Sepatu', 'sepatu', 'Cuci sepatu luar-dalam', 25000, 'Pasang', 'shoe', 1, datetime('now'));

INSERT OR IGNORE INTO notifications (id, title, message, is_active, created_at) VALUES
  ('notif-welcome', 'Selamat Datang di KuCuci 👋', 'Cuci bersih, wangi tahan lama. Pesan layanan laundry #1 untuk pengalaman terbaik Anda!', 1, datetime('now'));