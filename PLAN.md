# PLAN.md — Webapp Pemesanan Laundry (React + Cloudflare + SheetDB)

> Stack: React + Vite + TypeScript + Tailwind + Cloudflare Pages Functions + SheetDB (migration-ready) + PWA
> Status: Build Mode | Desain referensi: Figma mobile (Halo Aisyah, Diskon 20%, Layanan Kami, Pesanan Aktif, Riwayat)

## 1. Ringkasan & Keputusan Final

**Tujuan:** Webapp pemesanan laundry mobile-first yang bisa di-install (PWA) dan responsive di desktop. Customer pesan layanan, tracking status. Admin kelola pesanan/layanan.

**Keputusan User (Final):**
1. **Auth:** Gmail OAuth untuk customer (`@react-oauth/google`), hardcode admin `adminmala@gmail.com / adminmala123` via env hash (bcrypt) — bukan plain text di repo.
2. **Wallet & Promo Spesial:** DIHAPUS total dari UI Beranda (tidak render `Saldo Wallet` & `Promo Spesial`).
3. **Dashboard Admin:** Butuh role `admin` — kelola semua order & layanan.
4. **Deploy:** Cloudflare Pages Functions (Hono) — frontend + backend 1 repo.
5. **PWA + Responsive:** Ya, keduanya — mobile-first + PWA installable + cache.
6. **SheetDB:** User sudah punya akun, dev sediakan skema kolom lengkap + `SHEETDB_BASE_URL`.

---

## 2. Tech Stack Detail

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| Frontend | React 18, Vite, TypeScript, React Router v6, Tailwind CSS | Cepat, modern, mudah deploy Cloudflare |
| State | Zustand (wizard), TanStack Query v5 (server state) | Ringan, cache API otomatis |
| Validasi | Zod | Validasi konsisten FE & BE |
| Auth | @react-oauth/google, jose (JWT), bcryptjs | Google verify, JWT httpOnly cookie |
| Backend | Cloudflare Pages Functions + Hono.js | Satu deploy, edge, murah, D1-ready |
| DB | SheetDB API (Adapter Pattern) | Awal SheetDB, migrasi ke D1/Supabase 1 baris |
| PWA | vite-plugin-pwa + Workbox | Installable, offline cache |
| Tooling | ESLint, Prettier, Vitest | Quality |

---

## 3. Arsitektur Migration-Ready (Inti)

**Prinsip:** Jangan panggil SheetDB langsung dari component. Lewat interface.

```
React Component
   -> services/orderService.ts (business logic, Zod)
     -> lib/db/repository.ts (Interface: IOrderRepository, IServiceRepository, IUserRepository)
       -> lib/db/sheetdb.repository.ts  // implementasi sekarang
       -> lib/db/d1.repository.ts       // future, tinggal ganti di _middleware.ts
       -> lib/db/mock.repository.ts     // dev tanpa SheetDB
```

**Interface Contoh (`src/lib/db/repository.ts:1`):**
```ts
export interface IOrderRepository {
  findByUser(userId: string): Promise<Order[]>
  findById(id: string): Promise<Order | null>
  findAll(): Promise<Order[]> // admin
  create(data: CreateOrderDto): Promise<Order>
  updateStatus(id: string, status: OrderStatus, note?: string): Promise<Order>
}
```

**Inject di Cloudflare (`functions/api/_middleware.ts:8`):**
```ts
// sekarang
const repo = new SheetDBRepository(env.SHEETDB_BASE_URL)
// nanti migrasi D1, ganti 1 baris:
// const repo = new D1Repository(env.DB)
```

**Keuntungan:** Ganti DB tidak ubah component/service, DTO terisolasi, test pakai mock.

---

## 4. Struktur Folder

```
/ (root: C:\Users\k\Documents\Default Project)
├── PLAN.md
├── TODO.md
├── wrangler.toml
├── vite.config.ts
├── public/
│   ├── icons/icon-192.png
│   ├── icons/icon-512.png
│   └── manifest.json (auto generate via pwa)
├── src/
│   ├── components/
│   │   ├── ui/ (Button.tsx, Card.tsx, Badge.tsx, Stepper.tsx, Timeline.tsx, Input.tsx)
│   │   └── layout/ (Header.tsx, BottomNav.tsx, AdminSidebar.tsx, ProtectedRoute.tsx)
│   ├── pages/
│   │   ├── Beranda.tsx (tanpa Wallet/Promo)
│   │   ├── BuatPesanan/
│   │   │   ├── StepLayanan.tsx
│   │   │   ├── StepDetail.tsx
│   │   │   ├── StepJadwal.tsx
│   │   │   └── StepKonfirmasi.tsx
│   │   ├── DetailPesanan.tsx
│   │   ├── RiwayatPesanan.tsx
│   │   ├── Pesanan.tsx
│   │   ├── Akun.tsx
│   │   ├── Login.tsx
│   │   └── admin/
│   │       ├── Dashboard.tsx
│   │       ├── Orders.tsx
│   │       ├── Services.tsx
│   │       └── LoginAdmin.tsx
│   ├── stores/useWizardStore.ts
│   ├── services/ (authService.ts, orderService.ts, serviceService.ts)
│   ├── lib/
│   │   ├── db/ (repository.ts, sheetdb.client.ts, sheetdb.repository.ts)
│   │   └── auth/ (jwt.ts, googleVerify.ts)
│   ├── types/ (order.ts, user.ts, service.ts)
│   ├── hooks/useAuth.ts
│   └── mocks/services.mock.ts
└── functions/
    └── api/
        ├── _middleware.ts
        ├── auth/google.ts
        ├── auth/login.ts
        ├── auth/me.ts
        ├── auth/logout.ts
        ├── services.ts
        ├── orders.ts
        └── orders/[id].ts
```

---

## 5. Skema SheetDB (5 Sheet, 1 Spreadsheet)

Buat 1 Spreadsheet Google Sheet, buat 5 TAB dengan nama **persis lowercase**:

### a. `users`
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | string | PK, google sub (ex: 1089...) |
| name | string | Aisyah |
| email | string | aisyah@gmail.com, unique |
| avatar_url | string | https://... |
| role | string | customer / admin (default customer) |
| created_at | string | ISO 8601 |

### b. `services`
| id | name | slug | description | price | unit | icon_name | is_active | created_at |
|----|------|------|-------------|-------|------|-----------|-----------|------------|
| srv-01 | Cuci & Setrika | cuci-setrika | Cuci bersih + setrika | 12000 | Kg | washer | TRUE | 2024-05-01T00:00:00Z |
| srv-02 | Cuci Kering | cuci-kering | ... | 18000 | Kg | shirt | TRUE | ... |
| srv-03 | Setrika Saja | setrika-saja | ... | 6000 | Kg | iron | TRUE | ... |
| srv-04 | Bed Cover | bed-cover | ... | 25000 | Pc | bed | TRUE | ... |
| srv-05 | Sepatu | sepatu | ... | 20000 | Pasang | shoe | TRUE | ... |

### c. `orders`
| Kolom | Tipe | Ket |
|-------|------|-----|
| id | string | PK, format INV-YYMMDD-XXX (generate di Worker) |
| user_id | string | FK users.id |
| user_email | string | denormalisasi untuk query SheetDB |
| service_id | string | FK services.id |
| service_name | string | denormalisasi |
| weight | number | ex: 5 (untuk Kg) |
| qty | number | ex: 1 (untuk Pc/Pasang) — isi salah satu |
| unit | string | Kg / Pc / Pasang |
| total_price | number | price * weight/qty |
| status | string | diterima / dicuci / pengeringan / setrika / siap / selesai / dibatalkan |
| pickup_method | string | antar / jemput |
| pickup_date | string | ISO |
| finish_date | string | ISO (16 Mei 2024, 15:00) |
| notes | string | Tidak ada / catatan |
| created_at | string | ISO |
| updated_at | string | ISO |

### d. `order_history`
| id | order_id | status | timestamp | note | changed_by |
|----|----------|--------|-----------|------|------------|
| hist-01 | INV-240515-001 | diterima | 2024-05-15T10:30:00Z | Pesanan Diterima | system |
| hist-02 | INV-240515-001 | dicuci | 2024-05-15T11:00:00Z | Pakaian sedang dicuci | admin |

### e. `promos`
| id | title | code | discount_pct | min_order | expiry_date | is_active |
|----|-------|------|--------------|-----------|-------------|-----------|
| promo-01 | Cuci Hemat | HEMAT20 | 20 | 50000 | 2024-12-31 | TRUE |

> Env: `SHEETDB_BASE_URL=https://sheetdb.io/api/v1/xxxxx` — jika pakai Spreadsheet API, 1 ID untuk semua sheet. Cache: Cloudflare KV / memory 60 detik untuk GET services.

---

## 6. API Contract (Cloudflare Pages Functions)

| Method | Endpoint | Auth | Body / Query | Response |
|--------|----------|------|--------------|----------|
| POST | /api/auth/google | - | {id_token} | {user, token} + set cookie |
| POST | /api/auth/login | - | {email, password} | {user} + cookie (admin hardcode) |
| GET | /api/auth/me | cookie | - | {user} |
| POST | /api/auth/logout | cookie | - | {ok} |
| GET | /api/services | - | - | Service[] |
| POST | /api/services | admin | {name, price, unit} | Service |
| PATCH | /api/services/:id | admin | {...} | Service |
| POST | /api/orders | customer | {serviceId, weight, qty, pickup_date, notes} | Order |
| GET | /api/orders?mine=1 | customer | - | Order[] (milik user) |
| GET | /api/orders | admin | - | Order[] (semua) |
| GET | /api/orders/:id | customer/admin | - | Order + history |
| PATCH | /api/orders/:id | admin | {status, note} | Order |
| GET | /api/promos | admin | - | Promo[] |

Semua body validasi Zod di Functions, error format `{error: string}`.

---

## 7. UI/UX Detail per Halaman (Sesuai Figma, Tanpa Wallet/Promo)

### A. Beranda (`/` - `src/pages/Beranda.tsx:1`)
- **Header:** `Halo, {name} 👋` + subtitle `Bersih maksimal, wangi tahan lama` + hamburger kiri + bell kanan (badge 2)
- **Banner:** `Cuci Bersih, Hidup Lebih Praktis` + `Diskon 20% untuk Order Pertama` + ilustrasi keranjang + button `Pesan Sekarang` -> `/buat-pesanan`
- **Layanan Kami:** Grid 5 icon (Cuci & Setrika, Cuci Kering, Setrika Saja, Bed Cover, Sepatu) — horizontal scroll mobile, grid 5 desktop — klik preselect layanan
- **Pesanan Aktif (kondisional):** Card biru muda `#INV-240515-001` + badge `Sedang Diproses` + `Cuci & Setrika • 5 Kg` + `Selesai: 16 Mei 2024, 15:00` + ilustrasi mesin cuci -> `/pesanan/:id`
- **Riwayat Pesanan:** List 3 terbaru (`#INV-240512-003 Cuci Kering • 3 Kg Selesai Rp 75.000`) + `Lihat Semua` -> `/riwayat` — **Promo Spesial DIHAPUS**
- **BottomNav:** `Beranda | Pesanan | Buat Pesanan (+) | Promo (hide) | Akun` — active biru #2563EB

### B. Buat Pesanan (`/buat-pesanan` - Wizard 4 Step)
- **Stepper:** `Layanan (aktif biru) — Detail — Jadwal — Konfirmasi` (dot + garis)
- **Step 1 Layanan (`StepLayanan.tsx:1`):** Radio list 5 layanan + icon + `Mulai dari Rp 12.000 / Kg` + `Lanjutkan` (disabled sampai pilih) -> simpan di Zustand
- **Step 2 Detail (`StepDetail.tsx:1`):** Input `Berat/Qty` (number + unit dinamis), `Catatan` (textarea), estimasi `Total: Rp 60.000` (auto calc price * weight), kode promo optional
- **Step 3 Jadwal (`StepJadwal.tsx:1`):** Date picker `Tanggal Jemput` & `Jadwal Selesai`, radio `Antar / Jemput`
- **Step 4 Konfirmasi (`StepKonfirmasi.tsx:1`):** Ringkasan layanan + berat + jadwal + total + button `Buat Pesanan` -> POST /api/orders -> redirect `/pesanan/:id`
- **State:** Zustand `useWizardStore` + persist localStorage, validasi per step

### C. Detail Pesanan (`/pesanan/:id` - `src/pages/DetailPesanan.tsx:1`)
- **Header:** `#INV-240515-001` + badge `Sedang Diproses` + `Dipesan pada 15 Mei 2024, 10:30`
- **Timeline Vertikal (5 node):** 
  1. Pesanan Diterima 15 Mei 2024, 10:30 (centang hijau)
  2. Sedang Dicuci 15 Mei 2024, 11:00 (biru aktif, note "Pakaian Anda sedang kami cuci")
  3. Proses Pengeringan Menunggu (abu)
  4. Proses Setrika Menunggu
  5. Siap Diambil / Diantar Menunggu
- **Detail Pesanan:** Layanan `Cuci & Setrika`, Berat `5 Kg`, Jadwal Selesai `16 Mei 2024, 15:00`, Catatan `Tidak ada`
- **CTA:** `Hubungi Kami` (outline biru) -> `https://wa.me/62xxx?text=Halo...`

### D. Admin (`/admin/*`)
- **/admin/login:** Form email+password (adminmala@gmail.com) -> POST /api/auth/login
- **/admin:** Dashboard statistik (total order, diterima, dicuci, siap, selesai) — cards
- **/admin/orders:** Table semua order + filter status + search + action `Ubah Status` (dropdown) + lihat detail
- **/admin/services:** Table layanan + CRUD modal (tambah/edit/hapus + toggle is_active)
- **Guard (`ProtectedRoute.tsx:1`):** cek `user.role === 'admin'` else redirect `/`

### E. Lain
- `/pesanan` list semua, `/riwayat` sama, `/akun` profil + logout, `/login` Google button + divider admin login

**Design System:** Tailwind, primary `#2563EB`, secondary `#E0F2FE`, radius `16px`, shadow `0 4px 20px rgba(0,0,0,0.08)`, font Inter, icon `lucide-react`.

---

## 8. Auth Flow Detail

**Customer (Google):**
1. FE: `<GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID}>` + `GoogleLogin` button
2. Dapat `credential` (id_token) -> `POST /api/auth/google {id_token}`
3. BE: `googleVerify.ts` fetch `https://oauth2.googleapis.com/tokeninfo?id_token=xxx` -> cek aud, expiry -> upsert `users` sheet (jika belum ada buat)
4. Sign JWT `jose.sign({sub:id, email, role})` dengan `JWT_SECRET` env, set cookie `token=xxx; HttpOnly; Secure; SameSite=Lax; Max-Age=7d`
5. FE: `useAuth` fetch `/api/auth/me` -> simpan user di Zustand

**Admin (Hardcode):**
1. POST `/api/auth/login {email, password}` -> compare `bcrypt.compare(password, ADMIN_PASSWORD_HASH)` + cek `email === ADMIN_EMAIL`
2. Jika ok sign JWT `role=admin` -> set cookie sama
3. **Keamanan:** Password tidak di code, hash di env `ADMIN_PASSWORD_HASH` (generate: `npx bcryptjs hash adminmala123 10`)

**Middleware (`functions/api/_middleware.ts:1`):** Verifikasi cookie JWT di setiap `/api/*` kecuali `/api/auth/*`, inject `user` ke context + `repo`.

---

## 9. PWA & Responsive

**Plugin:** `vite-plugin-pwa` dengan `registerType: 'autoUpdate'`, `workbox: {runtimeCaching: [{urlPattern: /^https:\/\/sheetdb\.io\/.*/, handler: 'NetworkFirst', options: {cacheName: 'sheetdb-cache', expiration: {maxEntries: 50, maxAgeSeconds: 60}}}]}`

**Manifest (auto):**
```json
{ "name": "LaundryKu", "short_name": "Laundry", "theme_color": "#2563EB", "background_color": "#ffffff", "display": "standalone", "start_url": "/", "icons": [{ "src": "icons/icon-192.png", "sizes": "192x192" }, { "src": "icons/icon-512.png", "sizes": "512x512" }] }
```

**Responsive:** Mobile-first (max-w 480px center), `md:` grid layanan 5 kolom, admin sidebar `hidden md:block`, bottom nav `md:hidden` untuk customer.

---

## 10. Deployment Cloudflare

**Build:** `npm run build` -> `dist/`
**Deploy Opsi A (Git):** Connect repo GitHub ke Cloudflare Pages -> auto deploy tiap push, set env vars di Dashboard -> Settings -> Environment Variables
**Deploy Opsi B (Wrangler):** `npx wrangler pages deploy dist --project-name=laundry-webapp`

**Env Vars (Pages -> Settings -> Variables):**
- `SHEETDB_BASE_URL` (wajib)
- `JWT_SECRET` (random 32 char, `openssl rand -hex 32`)
- `GOOGLE_CLIENT_ID` (dari console.cloud.google.com)
- `ADMIN_EMAIL` = adminmala@gmail.com
- `ADMIN_PASSWORD_HASH` = bcrypt hash
- `VITE_GOOGLE_CLIENT_ID` (FE, prefix VITE_)

**wrangler.toml:**
```toml
name = "laundry-webapp"
type = "javascript"
pages_build_output_dir = "dist"
compatibility_date = "2024-01-01"
```

---

## 11. Panduan Google OAuth (User Action)

1. Buka https://console.cloud.google.com -> New Project `LaundryKu`
2. APIs & Services -> Credentials -> Create Credentials -> OAuth Client ID -> Application type: Web Application
3. Name: Laundry Webapp, Authorized JavaScript origins: `http://localhost:5173`, `https://laundry-webapp.pages.dev` (ganti domain)
4. Copy Client ID (ex: `xxx.apps.googleusercontent.com`) -> isi `.env` `VITE_GOOGLE_CLIENT_ID=xxx` dan `GOOGLE_CLIENT_ID` di Cloudflare Env
5. Test: `npm run dev` -> Login Google -> cek `/api/auth/me`

Jika belum ada Client ID, FE tetap jalan mode mock (button disabled + note).

---

## 12. Migrasi DB Nanti (D1 - 1 Baris)

1. `npx wrangler d1 create laundry-db` -> dapat `database_id` -> tambah di `wrangler.toml` `[[d1_databases]]`
2. Buat schema SQL `schema.sql` mirip sheet (CREATE TABLE users, services...)
3. Buat `src/lib/db/d1.repository.ts` implements `IOrderRepository` pakai `env.DB.prepare(...).all()`
4. Ganti di `functions/api/_middleware.ts:8` dari `new SheetDBRepository(env.SHEETDB_BASE_URL)` jadi `new D1Repository(env.DB)`
5. Export SheetDB JSON (`https://sheetdb.io/api/v1/xxx/users`) -> `wrangler d1 execute laundry-db --file=import.sql`

---

## 13. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| SheetDB rate limit 500/hari (free) | Cache 60s di Worker, debounce, batch |
| No transaction/join | Denormalisasi service_name di orders, generate INV di Worker |
| Hardcode admin bocor | Hash + env var, bukan plain di git, segera ganti password |
| Google OAuth belum siap | Mock auth agar UI tetap dites |
| PWA icon belum ada | Generate dari 1 PNG 512x512 via `pwa-asset-generator` |

---

*Plan ini akan dieksekusi sesuai TODO.md Fase 1-6. Update terakhir: 2026-08-20*
