-- KuCuci — D1 migration: kolom pembayaran Midtrans (QRIS)
-- Jalankan: npx wrangler d1 execute kucuci-db --remote --file=./migrations/005_payment.sql

ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN payment_ref TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN qr_url TEXT DEFAULT '';