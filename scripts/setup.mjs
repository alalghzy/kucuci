#!/usr/bin/env node
/**
 * KuCuci — setup sekali jalan setelah clone.
 * Jalankan: npm run setup
 *
 * 1. Cek versi Node
 * 2. npm install
 * 3. Buat .env + .dev.vars dari .env.example (tidak menimpa yang sudah ada)
 * 4. Cek login wrangler (Cloudflare)
 * 5. Tampilkan langkah berikutnya
 */
import { execSync } from 'node:child_process'
import { existsSync, copyFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const log = (m) => console.log(m)
const step = (n, m) => log(`\n\x1b[36m[${n}]\x1b[0m ${m}`)

// 1. Node >= 22
step(1, 'Cek versi Node.js...')
const major = Number(process.versions.node.split('.')[0])
if (major < 22) {
  log(`\x1b[31m✗ Node ${process.versions.node} terlalu lama. Install Node 22+ dari https://nodejs.org\x1b[0m`)
  process.exit(1)
}
log(`  ✓ Node ${process.versions.node}`)

// 2. Install deps
step(2, 'Install dependencies (npm install)...')
execSync('npm install', { cwd: root, stdio: 'inherit' })
log('  ✓ Selesai')

// 3. File env
step(3, 'Siapkan file environment...')
const example = join(root, '.env.example')
for (const target of ['.env', '.dev.vars']) {
  const p = join(root, target)
  if (existsSync(p)) {
    log(`  • ${target} sudah ada — dilewati (tidak ditimpa)`)
  } else {
    copyFileSync(example, p)
    log(`  ✓ ${target} dibuat dari .env.example — ISI NILAI SECRET-nya sebelum dev`)
  }
}

// 4. Wrangler login
step(4, 'Cek login Cloudflare (wrangler)...')
let cfOk = false
try {
  const out = execSync('npx wrangler whoami', { cwd: root, encoding: 'utf8', timeout: 60000 })
  cfOk = out.includes('Logged in') || out.includes('@')
  log(cfOk ? '  ✓ Terhubung ke Cloudflare' : '  ⚠ Belum terdeteksi login')
} catch {
  log('  ⚠ wrangler belum login (tidak masalah untuk develop, perlu untuk deploy)')
}
if (!cfOk) log('    → jalankan: npx wrangler login')

// 5. Next steps
step(5, 'Langkah berikutnya:')
log(`
  1. Edit \x1b[33m.env\x1b[0m dan \x1b[33m.dev.vars\x1b[0m — isi secret (Google OAuth, JWT, admin, Midtrans)
  2. Jalankan dev server:
       \x1b[32mnpm run dev\x1b[0m        → http://localhost:8787
  3. Deploy ke Cloudflare Pages:
       \x1b[32mnpm run deploy\x1b[0m
  4. Database baru dari nol?
       \x1b[32mnpx wrangler d1 create kucuci-db\x1b[0m  → salin database_id ke wrangler.toml
       \x1b[32mnpm run db:migrate:remote\x1b[0m
`)
log('\x1b[32m✓ Setup selesai. Selamat ngoding! 🧺\x1b[0m')
