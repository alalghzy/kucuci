# TODO.md — Webapp Pemesanan Laundry

> Checklist eksekusi build. Centang setelah selesai. Estimasi total 5-6 hari. Referensi PLAN.md untuk detail skema & API.

## Checklist Utama

### Fase 1 — Scaffold & Setup (Est 4 jam)
- [ ] `npm create vite@latest . -- --template react-ts` (di `C:\Users\k\Documents\Default Project`)
- [ ] Install deps: `react-router-dom`, `zustand`, `@tanstack/react-query`, `zod`, `@react-oauth/google`, `jose`, `bcryptjs`, `hono`, `vite-plugin-pwa`, `workbox-window`
- [ ] Install dev: `tailwindcss postcss autoprefixer`, `wrangler`, `@cloudflare/workers-types`
- [ ] `npx tailwindcss init -p` + config `content: ["./index.html","./src/**/*.{ts,tsx}"]`
- [ ] Setup `vite.config.ts` (PWA plugin + alias)
- [ ] Setup `wrangler.toml` (pages_build_output_dir = dist)
- [ ] Buat `.env.example` (VITE_GOOGLE_CLIENT_ID, SHEETDB_BASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH)
- [ ] Test `npm run dev` jalan di localhost:5173
- [ ] Git init + `.gitignore`

### Fase 2 — Design System & Layout (Est 4 jam)
- [ ] Buat `src/components/ui/Button.tsx:1` (variant primary/outline, size)
- [ ] Buat `src/components/ui/Card.tsx:1`, `Badge.tsx:1` (status: diterima/dicuci/siap)
- [ ] Buat `src/components/ui/Stepper.tsx:1` (4 step Layanan-Detail-Jadwal-Konfirmasi)
- [ ] Buat `src/components/ui/Timeline.tsx:1` (5 node vertikal)
- [ ] Buat `src/components/layout/Header.tsx:1` (Halo Aisyah + bell)
- [ ] Buat `src/components/layout/BottomNav.tsx:1` (Beranda/Pesanan/Buat Pesanan +/Akun)
- [ ] Buat `src/components/layout/ProtectedRoute.tsx:1` (cek role customer/admin)
- [ ] Buat `src/components/layout/AdminSidebar.tsx:1`
- [ ] Responsive test (mobile 390px, desktop 1024px)

### Fase 3 — Slicing Halaman Customer (Est 8 jam) — TANPA Wallet/Promo
- [ ] `src/pages/Beranda.tsx:1` — Header + Banner Diskon 20% + Layanan Kami (5 icon) + Pesanan Aktif (kondisional) + Riwayat Pesanan (3 item) — HAPUS Wallet & Promo Spesial
- [ ] `src/pages/BuatPesanan/StepLayanan.tsx:1` — Radio list 5 layanan + harga/Kg + Lanjutkan
- [ ] `src/pages/BuatPesanan/StepDetail.tsx:1` — Input berat/qty + catatan + estimasi total (price*weight)
- [ ] `src/pages/BuatPesanan/StepJadwal.tsx:1` — Date picker + metode antar/jemput
- [ ] `src/pages/BuatPesanan/StepKonfirmasi.tsx:1` — Ringkasan + POST /api/orders
- [ ] `src/stores/useWizardStore.ts:1` — Zustand persist localStorage (layanan, berat, jadwal)
- [ ] `src/pages/DetailPesanan.tsx:1` — Invoice + Timeline 5 status + Detail + Hubungi Kami (wa.me)
- [ ] `src/pages/RiwayatPesanan.tsx:1` + `src/pages/Pesanan.tsx:1` — List dengan filter
- [ ] `src/pages/Akun.tsx:1` — Profil + Logout
- [ ] `src/pages/Login.tsx:1` — GoogleLogin button + link Admin Login
- [ ] Mock data `src/mocks/services.mock.ts:1` untuk dev tanpa SheetDB

### Fase 4 — Auth (Est 4 jam)
- [ ] `src/lib/auth/jwt.ts:1` — sign/verify dengan `jose` + `JWT_SECRET`
- [ ] `src/lib/auth/googleVerify.ts:1` — fetch `https://oauth2.googleapis.com/tokeninfo`
- [ ] `functions/api/auth/google.ts:1` — POST {id_token} -> upsert users sheet -> set cookie HttpOnly
- [ ] `functions/api/auth/login.ts:1` — POST {email,password} -> bcrypt.compare vs ADMIN_PASSWORD_HASH -> role admin -> set cookie
- [ ] `functions/api/auth/me.ts:1` + `functions/api/auth/logout.ts:1`
- [ ] `functions/api/_middleware.ts:1` — verifikasi JWT, inject `user` & `repo` ke context
- [ ] `src/hooks/useAuth.ts:1` + `src/services/authService.ts:1` (TanStack Query)
- [ ] Generate hash: `npx bcryptjs hash adminmala123 10` -> simpan di env, test login adminmala@gmail.com
- [ ] Panduan Google OAuth di PLAN.md:11 — buat Client ID, isi VITE_GOOGLE_CLIENT_ID, test

### Fase 5 — Backend & SheetDB (Est 6 jam)
- [ ] `src/lib/db/repository.ts:1` — Interface IRepository (User, Service, Order, Promo)
- [ ] `src/lib/db/sheetdb.client.ts:1` — fetch wrapper SheetDB + cache 60s + error handling
- [ ] `src/lib/db/sheetdb.repository.ts:1` — implement IOrderRepository etc (GET/POST/PATCH ke SheetDB)
- [ ] `src/types/order.ts:1`, `user.ts:1`, `service.ts:1` + Zod schema
- [ ] `functions/api/services.ts:1` — GET (public) + POST/PATCH (admin)
- [ ] `functions/api/orders.ts:1` — POST (customer), GET (mine=1 vs admin all)
- [ ] `functions/api/orders/[id].ts:1` — GET + PATCH status (admin)
- [ ] `functions/api/promos.ts:1` — admin only
- [ ] Test E2E: Buat order customer -> cek sheet orders + order_history -> admin update status -> customer lihat timeline berubah
- [ ] Buat SheetDB 5 tab sesuai PLAN.md:5 (users, services, orders, order_history, promos) + isi dummy

### Fase 6 — Admin Dashboard (Est 4 jam)
- [ ] `src/pages/admin/LoginAdmin.tsx:1` — form email/password hardcode
- [ ] `src/pages/admin/Dashboard.tsx:1` — cards statistik (total, diproses, selesai)
- [ ] `src/pages/admin/Orders.tsx:1` — table + filter status + dropdown ubah status + search
- [ ] `src/pages/admin/Services.tsx:1` — table + modal CRUD + toggle is_active
- [ ] Guard admin di router (`/admin/*` cek role)
- [ ] Test: login adminmala@gmail.com -> ubah status INV-... -> verifikasi di DetailPesanan customer

### Fase 7 — PWA & Responsive (Est 3 jam)
- [ ] Config `vite-plugin-pwa` di `vite.config.ts:1` (registerType autoUpdate, workbox runtimeCaching SheetDB)
- [ ] Generate icons `public/icons/icon-192.png` & `icon-512.png` (dari 1 PNG 512)
- [ ] Manifest theme_color #2563EB, display standalone, start_url /
- [ ] Test installable: `npm run build` + preview -> Lighthouse PWA audit
- [ ] Offline fallback + cache services
- [ ] Responsive check: Beranda max-w 480px center desktop, admin sidebar

### Fase 8 — Deploy & QA (Est 2 jam)
- [ ] `npm run build` sukses, cek `dist/`
- [ ] Set env vars di Cloudflare Pages Dashboard (SHEETDB_BASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, VITE_GOOGLE_CLIENT_ID)
- [ ] Deploy via `npx wrangler pages deploy dist --project-name=laundry-webapp` atau Git connect
- [ ] QA flow: Login Google -> Buat Pesanan 4 step -> Detail timeline -> Admin update -> Customer cek -> Logout
- [ ] Hapus Wallet & Promo dari Beranda terverifikasi (tidak ada sisa code)
- [ ] Dokumentasi migrasi D1 di PLAN.md:12

---

## Task Harian (Jika Sprint)

**Hari 1:** Fase 1 + 2 (Scaffold + Design System)
**Hari 2:** Fase 3 (Slicing Beranda + Wizard)
**Hari 3:** Fase 4 (Auth)
**Hari 4:** Fase 5 (SheetDB + API)
**Hari 5:** Fase 6 + 7 (Admin + PWA)
**Hari 6:** Fase 8 (Deploy & QA)

## Prioritas

- **HIGH:** Fase 1, 3, 5 (scaffold, wizard, SheetDB) — blocker
- **MEDIUM:** Fase 4, 6 (auth, admin)
- **LOW:** Fase 7 polish PWA (bisa iterasi)

## Catatan

- Hardcode admin pakai hash di env, jangan commit plain `adminmala123` di git.
- Google OAuth Client ID belum ada — pakai mock auth dulu agar UI tetap jalan.
- SheetDB free limit 500/hari — aktifkan cache 60s.
- Setelah build, verifikasi `TODO.md` ini dicentang satu per satu.

*Last update: 2026-08-20 — Build Mode*
