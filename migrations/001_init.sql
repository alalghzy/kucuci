-- KuCuci — Cloudflare D1 schema (production-ready)
-- Di-jalankan via: npx wrangler d1 execute kucuci-db --remote --file=./migrations/001_init.sql

PRAGMA foreign_keys = ON;

-- ---------- USERS ----------
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL DEFAULT '',
  picture    TEXT DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  password_hash TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- SERVICES ----------
CREATE TABLE IF NOT EXISTS services (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  price       INTEGER NOT NULL DEFAULT 0,
  unit        TEXT NOT NULL DEFAULT 'Kg' CHECK (unit IN ('Kg', 'Pc', 'Pasang')),
  icon_name   TEXT DEFAULT 'washer',
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- NOTIFICATIONS ----------
CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------- ORDERS ----------
CREATE TABLE IF NOT EXISTS orders (
  id            TEXT PRIMARY KEY,
  user_id       TEXT,
  user_email    TEXT,
  service_id    TEXT,
  service_name  TEXT,
  unit          TEXT DEFAULT 'Kg',
  weight        TEXT DEFAULT '',
  qty           TEXT DEFAULT '',
  total_price   INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'diterima',
  payment_method TEXT DEFAULT 'qris',
  pickup_method TEXT DEFAULT 'jemput',
  pickup_date   TEXT DEFAULT '',
  finish_date   TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  address       TEXT DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT
);

-- ---------- ORDER HISTORY ----------
CREATE TABLE IF NOT EXISTS order_history (
  id         TEXT PRIMARY KEY,
  order_id   TEXT,
  status     TEXT,
  timestamp  TEXT NOT NULL DEFAULT (datetime('now')),
  note       TEXT DEFAULT '',
  changed_by TEXT DEFAULT ''
);

-- ---------- INDEXES ----------
CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(is_active);