// KuCuci — Cloudflare Pages Functions backend (Hono)
// Storage: Cloudflare D1 (SQLite) — production-ready, full gratis.
// Binding D1: kucuci_db (lihat wrangler.toml)
// env: JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'
import * as jose from 'jose'
import { compare, hash as bcryptHash } from 'bcryptjs'

const app = new Hono<{ Bindings: Env }>()

// ---------- D1 helpers ----------
// Eksekusi prepared statement; kembalikan rows (SELECT).
async function all<T = any>(c: any, sql: string, ...params: any[]): Promise<T[]> {
  const res = await c.env.kucuci_db.prepare(sql).bind(...params).all()
  return (res.results || []) as T[]
}

async function runStmt(c: any, sql: string, ...params: any[]): Promise<{ changes: number; last_row_id: number }> {
  const res = await c.env.kucuci_db.prepare(sql).bind(...params).run()
  return { changes: res.meta?.changes ?? 0, last_row_id: res.meta?.last_row_id ?? 0 }
}

// ctx D1 DB juga bisa diakses via c.env.kucuci_db; type di env.d.ts

async function makeToken(env: Env, payload: Record<string, unknown>): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(env.JWT_SECRET))
}

async function setSession(c, payload) {
  const token = await makeToken(c.env, payload)
  const secure = c.env.NODE_ENV === 'production' ? '; Secure' : ''
  c.header('Set-Cookie', `kucuci_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secure}`)
}

async function sessionCookieHeader(c, payload): Promise<string> {
  const token = await makeToken(c.env, payload)
  return `kucuci_token=${token}; HttpOnly; Secure; Path=/; Max-Age=604800; SameSite=Lax`
}

async function readSession(c): Promise<any | null> {
  const cookie = c.req.header('Cookie') || ''
  const m = cookie.match(/kucuci_token=([^;]+)/)
  if (!m) return null
  try {
    const { payload } = await jose.jwtVerify(m[1], new TextEncoder().encode(c.env.JWT_SECRET))
    return payload
  } catch { return null }
}

// ---------- AUTH ----------
app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json()
  if (email?.trim().toLowerCase() !== (c.env.ADMIN_EMAIL || '').toLowerCase()) {
    return c.json({ error: 'Email atau password salah' }, 401)
  }
  // Gunakan override password dari D1 (jika pernah diubah via halaman Profil),
  // jika tidak ada fallback ke ADMIN_PASSWORD_HASH dari env.
  const rows = await all<any>(c, "SELECT value FROM settings WHERE key = 'admin_password_hash'")
  const storedHash = rows[0]?.value
  const targetHash = storedHash || c.env.ADMIN_PASSWORD_HASH
  const ok = await compare(password || '', targetHash)
  if (!ok) return c.json({ error: 'Email atau password salah' }, 401)
  await setSession(c, { sub: 'admin', email, role: 'admin' })
  return c.json({ user: { id: 'admin', email, name: 'Admin', role: 'admin' } })
})

app.post('/api/auth/logout', async (c) => {
  c.header('Set-Cookie', 'kucuci_token=; HttpOnly; Path=/; Max-Age=0')
  return c.json({ ok: true })
})

app.get('/api/auth/me', async (c) => {
  const s = await readSession(c)
  if (!s) return c.json({ user: null })
  return c.json({ user: { id: s.sub, email: s.email, role: s.role, name: s.name || 'Pengguna KuCuci', avatar_url: s.picture || s.avatar_url || '' } })
})

// ---------- SETTINGS (nomor WA admin + teks dinamis) ----------
// Publik: baca nomor WA, tagline, dan teks promo (dipakai Hubungi Kami & banner)
app.get('/api/settings', async (c) => {
  const rows = await all<any>(c, "SELECT key, value FROM settings")
  const get = (k: string, fb = '') => rows.find(r => r.key === k)?.value || fb
  return c.json({
    wa_number: get('wa_number'),
    tagline: get('tagline', 'Cuci Bersih, Hidup Lebih Praktis'),
    promo_title: get('promo_title', 'Diskon 20%'),
    promo_subtitle: get('promo_subtitle', 'untuk Order Pertama'),
  })
})

// Hanya admin: update nomor WA / teks dinamis
app.put('/api/settings', async (c) => {
  const s = await readSession(c)
  if (!s || s.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  const body = await c.req.json()
  const allowed: Record<string, (v: string) => boolean> = {
    wa_number: v => /^[0-9]{8,15}$/.test(v),
    tagline: v => v.length <= 120,
    promo_title: v => v.length <= 80,
    promo_subtitle: v => v.length <= 80,
  }
  for (const [key, validate] of Object.entries(allowed)) {
    if (key in body) {
      const val = String(body[key] ?? '').trim()
      if (!validate(val)) return c.json({ error: `Nilai "${key}" tidak valid` }, 400)
      await runStmt(c, 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, val)
    }
  }
  return c.json({ ok: true })
})

// Hanya admin: ubah password admin
app.post('/api/profile/password', async (c) => {
  const s = await readSession(c)
  if (!s || s.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  const { old_password, new_password } = await c.req.json()
  const rows0 = await all<any>(c, "SELECT value FROM settings WHERE key = 'admin_password_hash'")
  const curHash = rows0[0]?.value || c.env.ADMIN_PASSWORD_HASH
  const currentOk = await compare(old_password || '', curHash)
  if (!currentOk) return c.json({ error: 'Password lama salah' }, 400)
  if (!new_password || String(new_password).length < 6) return c.json({ error: 'Password baru minimal 6 karakter' }, 400)
  const hash = await bcryptHash(String(new_password), 10)
  // Simpan hash baru ke D1? Admin hash ada di env (ADMIN_PASSWORD_HASH immutable Pages binding).
  // Catatan: env readonly; simpan override ke settings supaya dipakai login.
  await runStmt(c, 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', 'admin_password_hash', hash)
  return c.json({ ok: true })
})

// ---------- GOOGLE OAUTH ----------
function googleRedirectUri(env: Env): string {
  if (env.OAUTH_REDIRECT) return env.OAUTH_REDIRECT
  return `https://kucuci.pages.dev/api/auth/google/callback`
}

app.get('/api/auth/google', async (c) => {
  const env = c.env
  if (!env.GOOGLE_CLIENT_ID) return c.json({ error: 'Google OAuth belum dikonfigurasi (GOOGLE_CLIENT_ID kosong)' }, 500)
  const nonce = crypto.randomUUID()
  const state = await new jose.SignJWT({ nonce })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('10m')
    .sign(new TextEncoder().encode(env.JWT_SECRET))
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(env),
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  })
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302)
})

app.get('/api/auth/google/callback', async (c) => {
  const env = c.env
  const url = new URL(c.req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const googleErr = url.searchParams.get('error')

  const origin = (() => {
    if (env.OAUTH_REDIRECT) {
      try { return new URL(env.OAUTH_REDIRECT).origin } catch { /* abaikan */ }
    }
    return 'https://kucuci.pages.dev'
  })()

  const fail = (msg: string) => {
    console.error('[oauth-callback-fail]', msg)
    return Response.redirect(`${origin}/login?error=${encodeURIComponent(msg)}`, 302)
  }

  try {
    if (googleErr || !code || !state) return fail('Autentikasi Google dibatalkan atau gagal. Jika diminta izin, periksa status OAuth di Google Cloud (Testing vs Published) dan daftarkan email sebagai Test user.')
    try {
      await jose.jwtVerify(state, new TextEncoder().encode(env.JWT_SECRET))
    } catch { return fail('Sesi login tidak valid, silakan coba lagi.') }

    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return fail('Google OAuth belum dikonfigurasi.')

    let tokens: any
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: googleRedirectUri(env),
          grant_type: 'authorization_code',
        }),
      })
      tokens = await tokenRes.json()
    } catch (e: any) {
      console.error('[oauth-token-fetch-error]', e?.message || e)
      return fail(`Gagal berkomunikasi dengan Google saat menukar kode: ${e?.message || 'network error'}`)
    }

    if (!tokens.access_token) {
      console.error('Google token error', JSON.stringify(tokens))
      const reason = tokens?.error === 'invalid_grant'
        ? 'Kode sudah kadaluarsa / redirect URI tidak cocok. Pastikan URI redirect di Google Cloud = https://kucuci.pages.dev/api/auth/google/callback lalu coba lagi.'
        : `Gagal memproses login Google: ${tokens?.error_description || tokens?.error || 'unknown'}`
      return fail(reason)
    }

    let profile: { id?: string; email?: string; name?: string; picture?: string } = {}
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      profile = await userRes.json()
    } catch (e: any) {
      console.error('[oauth-userinfo-error]', e?.message || e)
      return fail(`Gagal mengambil profil Google: ${e?.message || 'network error'}`)
    }

    const email = profile.email || ''
    const role = email.toLowerCase() === (env.ADMIN_EMAIL || '').toLowerCase() ? 'admin' : 'customer'
    const cookie = await sessionCookieHeader(c, {
      sub: `google:${profile.id || email}`,
      email,
      role,
      name: profile.name || 'Pengguna KuCuci',
      picture: profile.picture || '',
    })
    const res = new Response(null, {
      status: 302,
      headers: {
        Location: `${origin}/`,
        'Set-Cookie': cookie,
      },
    })
    return res
  } catch (e: any) {
    console.error('[oauth-callback-unhandled]', e?.stack || e?.message || e)
    return fail(`Terjadi kesalahan internal saat login: ${e?.message || 'unknown error'}`)
  }
})

// ---------- SERVICES ----------
app.get('/api/services', async (c) => {
  const rows = await all<any>(c, 'SELECT * FROM services ORDER BY created_at ASC')
  const services = rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description || '',
    price: Number(r.price) || 0,
    unit: r.unit || 'Kg',
    icon_name: r.icon_name || 'washer',
    is_active: !!r.is_active,
    created_at: r.created_at || '',
  }))
  return c.json(services)
})

app.post('/api/services', async (c) => {
  const s = await readSession(c)
  if (!s || s.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  const { name, price, unit, slug, icon_name, description } = await c.req.json()
  if (!name || price == null) return c.json({ error: 'name & price required' }, 400)
  const id = `srv-${Date.now()}`
  const sl = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const now = new Date().toISOString()
  try {
    await runStmt(c,
      'INSERT INTO services (id, name, slug, description, price, unit, icon_name, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)',
      id, name, sl, description || '', Number(price) || 0, unit || 'Kg', icon_name || 'washer', now)
  } catch (e: any) {
    console.error('insert service error', e)
    return c.json({ error: 'Gagal menyimpan layanan' }, 500)
  }
  return c.json({ id, name, slug: sl, description: description || '', price: Number(price) || 0, unit: unit || 'Kg', icon_name: icon_name || 'washer', is_active: true, created_at: now })
})

app.patch('/api/services/:id', async (c) => {
  const s = await readSession(c)
  if (!s || s.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  const body = await c.req.json()
  const sets: string[] = []
  const params: any[] = []
  if (body.name !== undefined) { sets.push('name = ?'); params.push(String(body.name)) }
  if (body.price !== undefined) { sets.push('price = ?'); params.push(Number(body.price) || 0) }
  if (body.unit !== undefined) { sets.push('unit = ?'); params.push(String(body.unit)) }
  if (body.icon_name !== undefined) { sets.push('icon_name = ?'); params.push(String(body.icon_name)) }
  if (body.description !== undefined) { sets.push('description = ?'); params.push(String(body.description)) }
  if (body.slug !== undefined) { sets.push('slug = ?'); params.push(String(body.slug)) }
  if (body.is_active !== undefined) { sets.push('is_active = ?'); params.push(body.is_active ? 1 : 0) }
  if (sets.length === 0) return c.json({ ok: true, id })
  params.push(id)
  try {
    await runStmt(c, `UPDATE services SET ${sets.join(', ')} WHERE id = ?`, ...params)
  } catch (e: any) {
    console.error('update service error', e)
    return c.json({ error: 'Gagal update service' }, 500)
  }
  return c.json({ ok: true, id })
})

// ---------- NOTIFICATIONS ----------
app.get('/api/notifications', async (c) => {
  const s = await readSession(c)
  let rows
  if (s && s.role === 'admin') {
    rows = await all<any>(c, 'SELECT * FROM notifications ORDER BY created_at DESC')
  } else if (s) {
    // user: notifikasi umum (tanpa user_email) + notifikasi khusus dirinya
    rows = await all<any>(c, "SELECT * FROM notifications WHERE user_email = '' OR user_email = ? ORDER BY created_at DESC", s.email || '')
  } else {
    // guest: hanya umum
    rows = await all<any>(c, "SELECT * FROM notifications WHERE user_email = '' ORDER BY created_at DESC")
  }
  return c.json(rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    created_at: r.created_at,
    is_active: !!r.is_active,
    user_email: r.user_email || '',
    read_at: r.read_at || '',
    type: r.type || 'general',
    order_id: r.order_id || '',
  })))
})

// Tandai semua notifikasi SENDIRI sebagai sudah dibaca
app.post('/api/notifications/read-all', async (c) => {
  const s = await readSession(c)
  if (!s) return c.json({ error: 'Silakan login terlebih dahulu' }, 401)
  const now = new Date().toISOString()
  await runStmt(c, "UPDATE notifications SET read_at = ? WHERE user_email = ? AND read_at = ''", now, s.email || '')
  return c.json({ ok: true })
})

app.post('/api/notifications', async (c) => {
  const s = await readSession(c)
  if (!s || s.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  const { title, message, is_active, user_email, type, order_id } = await c.req.json()
  if (!title || !message) return c.json({ error: 'title & message required' }, 400)
  const id = `notif-${Date.now()}`
  const now = new Date().toISOString()
  try {
    await runStmt(c,
      'INSERT INTO notifications (id, title, message, is_active, created_at, user_email, read_at, type, order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id, String(title), String(message), is_active === false ? 0 : 1, now, String(user_email || ''), '', String(type || 'general'), String(order_id || ''))
  } catch (e: any) {
    console.error('insert notification error', e)
    return c.json({ error: 'Gagal menyimpan notifikasi' }, 500)
  }
  return c.json({ id, title: String(title), message: String(message), is_active: is_active !== false, created_at: now, user_email: String(user_email || ''), read_at: '', type: String(type || 'general'), order_id: String(order_id || '') })
})

app.patch('/api/notifications/:id', async (c) => {
  const s = await readSession(c)
  if (!s || s.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  const body = await c.req.json()
  const sets: string[] = []
  const params: any[] = []
  if (body.title !== undefined) { sets.push('title = ?'); params.push(String(body.title)) }
  if (body.message !== undefined) { sets.push('message = ?'); params.push(String(body.message)) }
  if (body.is_active !== undefined) { sets.push('is_active = ?'); params.push(body.is_active === false ? 0 : 1) }
  if (sets.length === 0) return c.json({ ok: true, id })
  params.push(id)
  try {
    await runStmt(c, `UPDATE notifications SET ${sets.join(', ')} WHERE id = ?`, ...params)
  } catch (e: any) {
    console.error('update notification error', e)
    return c.json({ error: 'Gagal update notifikasi' }, 500)
  }
  return c.json({ ok: true, id })
})

// ---------- ADDRESSES ----------
app.get('/api/addresses', async (c) => {
  const s = await readSession(c)
  if (!s) return c.json({ error: 'Silakan login terlebih dahulu' }, 401)
  const email = s.email || ''
  const rows = await all<any>(c, 'SELECT * FROM addresses WHERE user_email = ? ORDER BY created_at ASC', email)
  return c.json(rows.map((r) => ({
    id: r.id,
    label: r.label || '',
    address: r.address || '',
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    created_at: r.created_at || '',
  })))
})

app.post('/api/addresses', async (c) => {
  const s = await readSession(c)
  if (!s) return c.json({ error: 'Silakan login terlebih dahulu' }, 401)
  const { label, address, lat, lng } = await c.req.json()
  if (!address || String(address).trim().length < 3) return c.json({ error: 'Alamat wajib diisi (min. 3 karakter)' }, 400)
  const id = `addr-${Date.now()}`
  const now = new Date().toISOString()
  try {
    await runStmt(c,
      'INSERT INTO addresses (id, user_email, label, address, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id, s.email || '', label || '', String(address).trim(), lat != null ? Number(lat) : null, lng != null ? Number(lng) : null, now)
  } catch (e: any) {
    console.error('insert address error', e)
    return c.json({ error: 'Gagal menyimpan alamat' }, 500)
  }
  return c.json({ id, label: label || '', address: String(address).trim(), lat: lat != null ? Number(lat) : null, lng: lng != null ? Number(lng) : null, created_at: now })
})

app.delete('/api/addresses/:id', async (c) => {
  const s = await readSession(c)
  if (!s) return c.json({ error: 'Silakan login terlebih dahulu' }, 401)
  const id = c.req.param('id')
  // Hanya boleh hapus alamat milik sendiri
  await runStmt(c, 'DELETE FROM addresses WHERE id = ? AND user_email = ?', id, s.email || '')
  return c.json({ ok: true })
})

// ---------- ORDERS ----------
app.post('/api/orders', async (c) => {
  const s = await readSession(c)
  if (!s) return c.json({ error: 'Silakan login terlebih dahulu' }, 401)
  const b = await c.req.json()
  const id = `INV-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(Date.now()).slice(-3)}`
  const now = new Date().toISOString()
  try {
    await runStmt(c,
      `INSERT INTO orders (id, user_id, user_email, service_id, service_name, unit, weight, qty, total_price, status, payment_method, pickup_method, pickup_date, finish_date, notes, customer_name, pickup_time, address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, s.sub || 'customer', s.email || '', b.service_id || '', b.service_name || '', b.unit || 'Kg',
      b.weight ?? '', b.qty ?? '', Number(b.total_price) || 0, 'diterima', b.payment_method || 'qris', b.pickup_method || 'jemput',
      b.pickup_date || '', b.finish_date || '', b.notes || '', b.customer_name || '', b.pickup_time || '', b.address || '', now, now)
    await runStmt(c,
      'INSERT INTO order_history (id, order_id, status, timestamp, note, changed_by) VALUES (?, ?, ?, ?, ?, ?)',
      `hist-${Date.now()}`, id, 'diterima', now, 'Pesanan Diterima', s.email || '')
  } catch (e: any) {
    console.error('insert order error', e)
    return c.json({ error: 'Gagal menyimpan pesanan' }, 500)
  }
  return c.json({
    id, user_id: s.sub, user_email: s.email, service_id: b.service_id, service_name: b.service_name,
    unit: b.unit || 'Kg', weight: b.weight ?? '', qty: b.qty ?? '', total_price: Number(b.total_price) || 0,
    status: 'diterima', payment_method: b.payment_method || 'qris', pickup_method: b.pickup_method || 'jemput',
    pickup_date: b.pickup_date || '', finish_date: b.finish_date || '', notes: b.notes || '', customer_name: b.customer_name || '', pickup_time: b.pickup_time || '', address: b.address || '',
    created_at: now, updated_at: now,
  })
})

app.get('/api/orders', async (c) => {
  const s = await readSession(c)
  const mine = c.req.query('mine')
  if (!mine && (!s || s.role !== 'admin')) return c.json({ error: 'Unauthorized' }, 401)
  let list: any[]
  if (mine && s) {
    list = await all<any>(c, 'SELECT * FROM orders WHERE user_email = ? ORDER BY created_at DESC', s.email)
  } else {
    list = await all<any>(c, 'SELECT * FROM orders ORDER BY created_at DESC')
  }
  return c.json(list.map((o) => ({ ...o, total_price: Number(o.total_price) || 0 })))
})

app.patch('/api/orders/:id', async (c) => {
  const s = await readSession(c)
  if (!s || s.role !== 'admin') return c.json({ error: 'Unauthorized' }, 401)
  const id = c.req.param('id')
  const { status, note } = await c.req.json()
  const now = new Date().toISOString()
  await runStmt(c, 'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', status || '', now, id)
  await runStmt(c,
    'INSERT INTO order_history (id, order_id, status, timestamp, note, changed_by) VALUES (?, ?, ?, ?, ?, ?)',
    `hist-${Date.now()}`, id, status || '', now, note || '', s.email || '')

  // Kirim notifikasi ke pemilik order ketika status berubah (khususnya 'siap' / 'selesai')
  const os = String(status || '')
  if (os === 'siap' || os === 'selesai') {
    const ord = await all<any>(c, 'SELECT user_email, service_name FROM orders WHERE id = ?', id)
    const target = ord[0]?.user_email || ''
    if (target) {
      const title = os === 'siap' ? 'Pesanan Siap Diambil' : 'Pesanan Selesai'
      const label = ord[0]?.service_name || 'pesanan'
      await runStmt(c,
        'INSERT INTO notifications (id, title, message, is_active, created_at, user_email, read_at, type, order_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        `notif-${Date.now()}`, title, `Pesanan ${label} dengan invoice #${id} telah ${os === 'siap' ? 'siap diambil (diantar)' : 'selesai'}.`, 1, now, target, '', 'order', id)
    }
  }

  return c.json({ ok: true, id, status })
})

// ---------- MIDTRANS (QRIS payment gateway) ----------
// Pembayaran otomatis: charge QRIS -> webhook -> order 'diterima'
// Env: MIDTRANS_SERVER_KEY, MIDTRANS_IS_PRODUCTION

function midtransBase(c: any): string {
  return c.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com'
}
function midtransAuth(c: any): string {
  return 'Basic ' + btoa((c.env.MIDTRANS_SERVER_KEY || '') + ':')
}
function midtransEnabled(c: any): boolean {
  return !!(c.env.MIDTRANS_SERVER_KEY)
}

// 1) Charge QRIS -> buat transaksi, simpan payment_ref + QR, kembalikan ke FE
app.post('/api/payment/charge', async (c) => {
  const s = await readSession(c)
  if (!s) return c.json({ error: 'Silakan login terlebih dahulu' }, 401)
  if (!midtransEnabled(c)) return c.json({ error: 'Payment gateway belum dikonfigurasi', sandbox_only: true }, 503)
  const { order_id, gross_amount, customer_name } = await c.req.json()
  const amount = Math.round(Number(gross_amount) || 0)
  if (!order_id || amount <= 0) return c.json({ error: 'Data tidak valid' }, 400)

  const payload = {
    payment_type: 'qris',
    transaction_details: { order_id: String(order_id), gross_amount: amount },
    customer_details: { first_name: customer_name || 'Pelanggan', email: s.email || '' },
    qris: { type: 'static' },
    custom_field1: 'kucuci-qris',
  }

  try {
    const res = await fetch(`${midtransBase(c)}/v1/charge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': midtransAuth(c) },
      body: JSON.stringify(payload),
    })
    const data: any = await res.json()
    if (!res.ok) {
      console.error('Midtrans charge error', data)
      return c.json({ error: 'Gagal membuat pembayaran', detail: data?.status_message || res.statusText }, 502)
    }

    // Simpan payment_ref + qr di order
    const paymentRef = data?.transaction_id || data?.order_id || String(order_id)
    const qrUrl = data?.actions?.map?.((a: any) => a.name === 'generate-qr-code' || a.name === 'qr-code' ? a.url : null).filter(Boolean)?.[0] || ''
    const now = new Date().toISOString()
    await runStmt(c, 'UPDATE orders SET payment_status = ?, payment_ref = ?, qr_url = ?, updated_at = ? WHERE id = ?',
      'pending', String(paymentRef), String(qrUrl), now, String(order_id))

    return c.json({ ok: true, order_id, payment_ref: paymentRef, qr_url: qrUrl, amount })
  } catch (e: any) {
    console.error('Midtrans charge exception', e)
    return c.json({ error: 'Gagal terhubung ke payment gateway' }, 502)
  }
})

// 2) Cek status pembayaran (polling frontend). Fallback: query ke Midtrans transaction status.
app.get('/api/payment/status/:orderId', async (c) => {
  const s = await readSession(c)
  if (!s) return c.json({ error: 'Silakan login terlebih dahulu' }, 401)
  const orderId = c.req.param('orderId')
  const rows = await all<any>(c, 'SELECT id, status, payment_status, payment_ref FROM orders WHERE id = ?', orderId)
  const order = rows[0]
  if (!order) return c.json({ error: 'Order tidak ditemukan' }, 404)

  // Sudah dikonfirmasi sukses (via webhook) -> langsung
  if (order.status === 'diterima' || order.payment_status === 'success') {
    return c.json({ ok: true, status: 'settlement', order_status: 'diterima' })
  }

  // Tanya Midtrans jika ada payment_ref
  if (midtransEnabled(c) && order.payment_ref) {
    try {
      const res = await fetch(`${midtransBase(c)}/v2/${encodeURIComponent(order.payment_ref)}/status`, {
        headers: { 'Accept': 'application/json', 'Authorization': midtransAuth(c) },
      })
      const data: any = await res.json()
      const tx = data?.transaction_status // capture, settlement, pending, cancel, expire, deny
      if (tx === 'settlement' || tx === 'capture') {
        await runStmt(c, 'UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?',
          'diterima', 'success', new Date().toISOString(), orderId)
        await runStmt(c,
          'INSERT INTO order_history (id, order_id, status, timestamp, note, changed_by) VALUES (?, ?, ?, ?, ?, ?)',
          `hist-${Date.now()}`, orderId, 'diterima', new Date().toISOString(), 'Pembayaran diterima (QRIS)', s.email || '')
        return c.json({ ok: true, status: 'settlement', order_status: 'diterima' })
      }
      return c.json({ ok: true, status: tx || 'pending', order_status: order.status })
    } catch (e) {
      console.error('Midtrans status error', e)
      return c.json({ ok: true, status: 'pending', order_status: order.status })
    }
  }
  return c.json({ ok: true, status: order.payment_status || 'pending', order_status: order.status })
})

// 3) Webhook Midtrans -> konfirmasi pembayaran otomatis
app.post('/api/payment/notify', async (c) => {
  const body: any = await c.req.json().catch(() => ({}))
  const orderId = body?.order_id || body?.transaction_id || ''
  const status = (body?.transaction_status || '').toLowerCase()
  if (!orderId) return c.json({ ok: false, error: 'no order id' }, 400)

  const rows = await all<any>(c, 'SELECT id FROM orders WHERE id = ? OR payment_ref = ?', orderId, orderId)
  if (!rows[0]) return c.json({ ok: true, ignored: true })

  if (status === 'settlement' || status === 'capture') {
    const now = new Date().toISOString()
    await runStmt(c, 'UPDATE orders SET status = ?, payment_status = ?, updated_at = ? WHERE id = ?',
      'diterima', 'success', now, rows[0].id)
    await runStmt(c,
      'INSERT INTO order_history (id, order_id, status, timestamp, note, changed_by) VALUES (?, ?, ?, ?, ?, ?)',
      `hist-${Date.now()}`, rows[0].id, 'diterima', now, 'Pembayaran diterima (webhook QRIS)', 'system')
  } else if (status === 'pending') {
    await runStmt(c, "UPDATE orders SET payment_status = 'pending', updated_at = ? WHERE id = ?", new Date().toISOString(), rows[0].id)
  }
  return c.json({ ok: true })
})

export const onRequest = handle(app)