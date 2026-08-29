# KuCuci 🧺

Webapp laundry (PWA mobile-first) — React 19 + Vite + TypeScript + Tailwind, backend Hono di Cloudflare Pages Functions, database Cloudflare D1 (SQLite). Login Google OAuth, notifikasi per-user, alamat dengan peta (Leaflet + OpenStreetMap), pembayaran QRIS otomatis (Midtrans) / COD.

**Live demo**: https://kucuci.pages.dev

## Stack

| Layer | Teknologi | Biaya |
|-------|-----------|-------|
| Frontend | React 19, Vite, TailwindCSS, Zustand, PWA | Gratis |
| Backend | Cloudflare Pages Functions (Hono) | Gratis (tier Workers/Pages free) |
| Database | Cloudflare D1 (SQLite serverless) | Gratis |
| Auth | Google OAuth + JWT cookie HttpOnly | Gratis |
| Peta | Leaflet + OpenStreetMap (tanpa API key) | Gratis |
| Pembayaran | Midtrans QRIS (opsional) | Gratis, fee per transaksi |

## Requirement

- **Node.js ≥ 22** (disarankan 22 LTS; diuji juga di Node 26)
- **npm ≥ 10**
- Akun **Cloudflare** (gratis) — untuk deploy & D1
- Akun **Google Cloud** (gratis) — untuk OAuth Client ID (opsional, hanya jika perlu login Google)
- Akun **Midtrans sandbox** (gratis, opsional) — untuk QRIS otomatis

## 🚀 Setup Cepat (clone → jalan)

```bash
git clone https://github.com/alalghzy/kucuci.git
cd kucuci
npm run setup
```

`npm run setup` akan: install dependencies → buat `.env` & `.dev.vars` dari contoh → cek login wrangler.

Isi nilai secret di `.env` + `.dev.vars` (lihat `.env.example` untuk penjelasan tiap variabel), lalu:

```bash
npm run dev        # http://localhost:8787 (frontend + functions + D1 lokal)
```

## Perintah

| Perintah | Fungsi |
|----------|--------|
| `npm run setup` | Install semua + siapkan file env + cek wrangler login |
| `npm run dev` | Dev server lokal (Vite + Pages Functions + D1 SQLite lokal) |
| `npm run build` | Build production (typecheck + vite build) |
| `npm run preview` | Preview hasil build |
| `npm run db:migrate` | Terapkan migrasi D1 ke database lokal |
| `npm run db:migrate:remote` | Terapkan migrasi D1 ke database production |
| `npm run deploy` | Build + deploy ke Cloudflare Pages |

## Struktur Project

```
├── src/                  # Frontend React
│   ├── pages/            #   Beranda, BuatPesanan, Pesanan, DetailPesanan,
│   │                     #   Pembayaran, Akun, Login, Notifikasi, Alamat, admin/
│   ├── stores/           #   Zustand (auth, order, service, notification, settings, wizard)
│   ├── components/       #   UI + LeafletMap
│   └── lib/              #   format, constants, api
├── functions/api/        # Backend Hono (semua endpoint REST)
├── migrations/           # SQL migrasi D1 (001_init ... 006_notif_user)
├── public/               # Aset statis + PWA icons
├── wrangler.toml         # Config Cloudflare (nama project, binding D1)
└── .env.example          # Dokumentasi semua variabel environment
```

## Konfigurasi Cloudflare (sekali per machine)

```bash
npx wrangler login                                   # authorize via browser
npx wrangler pages project list                      # cek project "kucuci" ada
```

Jika deploy dari akun/repo baru, buat resource dulu:

```bash
npx wrangler d1 create kucuci-db                     # salin database_id ke wrangler.toml
npm run db:migrate:remote                            # jalankan semua migrasi
npx wrangler pages project create kucuci --production-branch main
```

Set secret production (nilai asli ada di pengelola project, JANGAN taruh di repo):

```bash
npx wrangler pages secret put JWT_SECRET --project-name=kucuci
npx wrangler pages secret put GOOGLE_CLIENT_ID --project-name=kucuci
npx wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name=kucuci
npx wrangler pages secret put ADMIN_EMAIL --project-name=kucuci
npx wrangler pages secret put ADMIN_PASSWORD_HASH --project-name=kucuci
# opsional Midtrans:
npx wrangler pages secret put MIDTRANS_SERVER_KEY --project-name=kucuci
npx wrangler pages secret put MIDTRANS_CLIENT_KEY --project-name=kucuci
```

## Deploy

```bash
npm run deploy
```

Atau hubungkan repo ini ke **Cloudflare Pages** (Dashboard → Pages → Connect to Git) supaya **auto-deploy setiap push ke `main`** — build command `npm run build`, output `dist`, lalu set env/secret di dashboard sekali.

## Catatan Penting

- **Admin login**: buka `/kucuci_admin` di URL → login email admin + password (hash di secret/env, bisa diganti dari tab Profil admin).
- **Google OAuth**: daftarkan Redirect URI `https://<domain>/api/auth/google/callback` di Google Cloud Console.
- **Midtrans**: tanpa `MIDTRANS_SERVER_KEY`, order QRIS tetap dibuat tapi tanpa QR otomatis (mode manual). Webhook: set Notification URL ke `https://<domain>/api/payment/notify` di dashboard Midtrans.
- **Secret tidak pernah di-commit**: `.env`, `.dev.vars`, `.wrangler/` sudah di `.gitignore`.
- Data lama hasil migrasi SheetDB→D1 ada di database production; clone baru memakai D1 yang sama (atau buat baru + migrasi dari nol).
