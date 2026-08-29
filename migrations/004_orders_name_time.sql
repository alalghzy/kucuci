-- KuCuci — D1 migration: tambah kolom customer_name & pickup_time ke orders
-- Jalankan: npx wrangler d1 execute kucuci-db --remote --file=./migrations/004_orders_name_time.sql

ALTER TABLE orders ADD COLUMN customer_name TEXT DEFAULT '';
ALTER TABLE orders ADD COLUMN pickup_time TEXT DEFAULT '';