import { useState, useEffect } from 'react'
import { useOrderStore } from '../../stores/useOrderStore'
import { useAuthStore } from '../../stores/useAuthStore'
import { useServiceStore, slugify, pickIcon, syncAddService, syncUpdateService } from '../../stores/useServiceStore'
import { useConfigStore } from '../../stores/useConfigStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useNavigate } from 'react-router-dom'
import { rupiah, iconFor } from '../../lib/format'
import type { OrderStatus } from '../../types/order'
import type { Service } from '../../types/service'
import { pushOrderStatus } from '../../stores/useOrderStore'
import { useNotificationStore, syncAddNotification, syncUpdateNotification } from '../../stores/useNotificationStore'
import type { Notification } from '../../types/notification'

const statuses: OrderStatus[] = ['diterima', 'dicuci', 'pengeringan', 'setrika', 'siap', 'selesai', 'dibatalkan']
const inProgress = ['diterima', 'dicuci', 'pengeringan', 'setrika']

export default function AdminDashboard() {
  const { orders, updateOrder } = useOrderStore()
  const { user } = useAuthStore()
  const nav = useNavigate()
  const [view, setView] = useState<'orders' | 'services' | 'payment' | 'notifications' | 'profile'>('orders')
  const [filter, setFilter] = useState('semua')

  useEffect(() => {
    if (user?.role !== 'admin') nav('/login')
    // Admin: muat SEMUA order dari semua user
    useOrderStore.getState().loadAll()
  }, [user, nav])

  if (user?.role !== 'admin') return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">Mengalihkan...</p></div>

  const filtered = orders.filter(o => filter === 'semua' ? true : o.status === filter)

  return (
    <div className="max-w-[1000px] mx-auto min-h-screen bg-slate-50 pb-16">
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="flex justify-between items-center px-5 h-16 max-w-[1000px] mx-auto">
          <div className="flex items-center gap-2 font-bold text-slate-900"><span className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white text-sm">K</span> Admin KuCuci</div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden md:block">{user.email}</span>
            <button onClick={() => nav('/')} className="text-sm text-slate-500 hover:text-slate-700">Beranda</button>
            <button onClick={() => nav('/akun')} className="text-sm text-primary">Akun ›</button>
          </div>
        </div>
        <div className="border-t border-slate-100">
          <div className="flex gap-1 max-w-[1000px] mx-auto px-5">
            {([['orders', 'Pesanan'], ['services', 'Layanan'], ['payment', 'Pembayaran'], ['notifications', 'Notifikasi'], ['profile', 'Profil']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setView(k)} className={`px-4 py-3 text-sm font-semibold border-b-2 ${view === k ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{l}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-[1000px] mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <Stat label="Total Order" value={orders.length} color="bg-blue-50 text-blue-700" />
          <Stat label="Sedang Diproses" value={orders.filter(o => inProgress.includes(o.status)).length} color="bg-orange-50 text-orange-600" />
          <Stat label="Selesai" value={orders.filter(o => o.status === 'selesai').length} color="bg-green-50 text-green-600" />
          <Stat label="Omzet" value={rupiah(orders.reduce((a, o) => a + o.total_price, 0))} color="bg-slate-50 text-slate-700" />
        </div>

        {view === 'orders' ? (
          <div className="mt-6">
            <div className="flex flex-wrap gap-2 mb-3">
              {['semua', ...statuses].map(s => (
                <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize ${filter === s ? 'bg-primary text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>{s}</button>
              ))}
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {filtered.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Tidak ada pesanan</div>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead><tr className="bg-slate-50 text-left text-xs uppercase text-slate-400"><th className="p-3 font-semibold">Invoice</th><th className="p-3 font-semibold">Layanan</th><th className="p-3 font-semibold">Total</th><th className="p-3 font-semibold">Status</th><th className="p-3 font-semibold">Aksi</th></tr></thead>
                  <tbody>
                    {filtered.map(o => (
                      <tr key={o.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">#{o.id}</p>
                          <p className="text-xs text-slate-400">{o.user_email}</p>
                          <p className="text-[10px] text-slate-300">{new Date(o.created_at).toLocaleDateString('id-ID')}</p>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-lg">{iconFor({ icon_name: o.service_name })}</span>
                            <span className="text-slate-700">{o.service_name}<br /><span className="text-xs text-slate-400">{o.weight ? `${o.weight} Kg` : `${o.qty} ${o.unit}`}</span></span>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">{rupiah(o.total_price)}</td>
                        <td className="p-3">
                          <select value={o.status} onChange={async e => { const v = e.target.value as OrderStatus; updateOrder(o.id, { status: v, updated_at: new Date().toISOString() }); await pushOrderStatus(o.id, v) }}
                            className={`capitalize px-2 py-1.5 rounded-lg border-2 focus:outline-none ${o.status === 'dibatalkan' ? 'border-red-200 text-red-600 bg-red-50' : o.status === 'selesai' ? 'border-green-200 text-green-700 bg-green-50' : 'border-blue-200 text-blue-700 bg-blue-50'}`}>
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="p-3"><button onClick={() => nav(`/pesanan/${o.id}`)} className="text-sm text-primary hover:underline">Lihat</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : view === 'services' ? (
          <ServiceManager />
        ) : view === 'notifications' ? (
          <NotificationManager />
        ) : view === 'profile' ? (
          <ProfileManager />
        ) : (
          <QrisSettings />
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return <div className={`${color} p-4 rounded-2xl`}><p className="text-xs opacity-80">{label}</p><p className="text-xl font-bold mt-0.5">{value}</p></div>
}

function ServiceManager() {
  const { services, addService, updateService, removeService, toggleActive } = useServiceStore()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState<{ name: string; price: string; unit: 'Kg' | 'Pc' | 'Pasang' }>({ name: '', price: '', unit: 'Kg' })

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const openAdd = () => { setEditingId(null); setForm({ name: '', price: '', unit: 'Kg' }); setAdding(true) }
  const openEdit = (s: Service) => { setEditingId(s.id); setForm({ name: s.name, price: String(s.price), unit: s.unit }); setAdding(true) }

  const save = async () => {
    if (!form.name.trim() || !form.price) return
    const price = Number(form.price) || 0
    if (editingId) {
      const existing = services.find(x => x.id === editingId)
      if (existing) { updateService(editingId, { name: form.name.trim(), price, unit: form.unit, slug: existing.slug }); await syncUpdateService(editingId, { name: form.name.trim(), price, unit: form.unit, is_active: existing.is_active }) }
      flash('Layanan diperbarui')
    } else {
      const name = form.name.trim()
      const data = { name, price, unit: form.unit, slug: slugify(name), icon_name: pickIcon(name, slugify(name)), description: '' }
      addService(data)
      await syncAddService(data)
      flash(`Layanan "${name}" ditambahkan`)
    }
    setAdding(false)
  }

  const confirmRemove = (s: Service) => {
    if (window.confirm(`Hapus layanan "${s.name}"?`)) { removeService(s.id); flash('Layanan dihapus') }
  }

  return (
    <div className="mt-6">
      {toast && <div className="fixed top-4 right-4 z-[60] bg-primary text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-slate-900">Daftar Layanan</h2>
        <button onClick={openAdd} className="bg-primary text-white text-sm px-4 py-2 rounded-xl font-semibold">+ Tambah Layanan</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {services.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-4 border-b border-slate-50">
            <span className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-xl">{iconFor(s)}</span>
            <div className="flex-1">
              <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
              <p className="text-xs text-slate-400">{rupiah(s.price)} / {s.unit}</p>
            </div>
            <button
              onClick={() => { const next = !s.is_active; toggleActive(s.id); syncUpdateService(s.id, { is_active: next }) }}
              className={`relative w-10 h-6 rounded-full transition ${s.is_active ? 'bg-primary' : 'bg-slate-200'}`}
              title={s.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${s.is_active ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            <span className={`text-[11px] px-2.5 py-1 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{s.is_active ? 'Aktif' : 'Nonaktif'}</span>
            <button onClick={() => openEdit(s)} className="text-sm text-primary hover:underline">Edit</button>
            <button onClick={() => confirmRemove(s)} className="text-sm text-red-500 hover:underline">Hapus</button>
          </div>
        ))}
      </div>

      {adding && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-4">{editingId ? 'Edit Layanan' : 'Tambah Layanan'}</h3>
            <div className="space-y-3">
              <input className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:border-primary outline-none" placeholder="Nama layanan" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:border-primary outline-none" type="number" placeholder="Harga (Rp)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              <div className="flex gap-2">
                {(['Kg', 'Pc', 'Pasang'] as const).map(u => (
                  <button key={u} onClick={() => setForm({ ...form, unit: u })} className={`flex-1 py-2 rounded-lg text-sm border-2 ${form.unit === u ? 'border-primary bg-secondary text-primary' : 'border-slate-100 text-slate-500'}`}>{u}</button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-3">Perubahan tersimpan di perangkat admin (lokal). Hubungkan SheetDB untuk penyimpanan bersama.</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setAdding(false)} className="flex-1 py-2.5 rounded-xl border-2 border-slate-100 text-slate-500 text-sm font-semibold">Batal</button>
              <button disabled={!form.name.trim() || !form.price} onClick={save} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationManager() {
  const { notifications, addNotification, updateNotification, removeNotification, toggleActive, load } = useNotificationStore()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState<{ title: string; message: string }>({ title: '', message: '' })

  useEffect(() => { load() }, [load])

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  const openAdd = () => { setEditingId(null); setForm({ title: '', message: '' }); setAdding(true) }
  const openEdit = (n: Notification) => { setEditingId(n.id); setForm({ title: n.title, message: n.message }); setAdding(true) }

  const save = async () => {
    if (!form.title.trim() || !form.message.trim()) return
    if (editingId) {
      const existing = notifications.find(x => x.id === editingId)
      updateNotification(editingId, { title: form.title.trim(), message: form.message.trim() })
      if (existing) await syncUpdateNotification(editingId, { title: form.title.trim(), message: form.message.trim() })
      flash('Notifikasi diperbarui')
    } else {
      addNotification({ title: form.title.trim(), message: form.message.trim(), is_active: true })
      await syncAddNotification({ title: form.title.trim(), message: form.message.trim(), is_active: true })
      flash('Notifikasi ditambahkan')
    }
    setAdding(false)
  }

  const confirmRemove = (n: Notification) => {
    if (window.confirm(`Hapus notifikasi "${n.title}"?`)) { removeNotification(n.id); flash('Notifikasi dihapus') }
  }

  return (
    <div className="mt-6">
      {toast && <div className="fixed top-4 right-4 z-[60] bg-primary text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">{toast}</div>}
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-slate-900">Kelola Notifikasi</h2>
        <button onClick={openAdd} className="bg-primary text-white text-sm px-4 py-2 rounded-xl font-semibold">+ Tambah Notifikasi</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {notifications.length === 0 && <div className="p-10 text-center text-slate-400 text-sm">Belum ada notifikasi. Tambahkan untuk info terkini kepada pelanggan.</div>}
        {notifications.map(n => (
          <div key={n.id} className="flex items-start gap-3 p-4 border-b border-slate-50">
            <span className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-xl">🔔</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800 text-sm truncate">{n.title}</p>
                <button onClick={() => { const next = !n.is_active; toggleActive(n.id); syncUpdateNotification(n.id, { is_active: next }) }}
                  className={`relative w-9 h-5 rounded-full transition shrink-0 ${n.is_active ? 'bg-primary' : 'bg-slate-200'}`} title={n.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${n.is_active ? 'left-[17px]' : 'left-0.5'}`} />
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
              <p className="text-[11px] text-slate-300 mt-1">{new Date(n.created_at).toLocaleString('id-ID')}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => openEdit(n)} className="text-xs text-primary hover:underline text-left">Edit</button>
              <button onClick={() => confirmRemove(n)} className="text-xs text-red-500 hover:underline text-left">Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {adding && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-bold text-slate-900 mb-4">{editingId ? 'Edit Notifikasi' : 'Tambah Notifikasi'}</h3>
            <div className="space-y-3">
              <input className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:border-primary outline-none" placeholder="Judul (mis. Diskon Spesial)" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <textarea className="w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:border-primary outline-none h-28" placeholder="Isi pesan notifikasi..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setAdding(false)} className="flex-1 py-2.5 rounded-xl border-2 border-slate-100 text-slate-500 text-sm font-semibold">Batal</button>
              <button disabled={!form.title.trim() || !form.message.trim()} onClick={save} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProfileManager() {
  const { user } = useAuthStore()
  const { settings, update: updateSettings } = useSettingsStore()
  const [wa, setWa] = useState(settings.wa_number)
  const [tagline, setTagline] = useState(settings.tagline)
  const [promoTitle, setPromoTitle] = useState(settings.promo_title)
  const [promoSub, setPromoSub] = useState(settings.promo_subtitle)
  const [waStatus, setWaStatus] = useState('')
  const [textStatus, setTextStatus] = useState('')
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [passStatus, setPassStatus] = useState('')

  // Muat settings dari backend saat pertama tampil
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const d = await res.json()
          if (d.wa_number) setWa(d.wa_number)
          if (d.tagline) setTagline(d.tagline)
          if (d.promo_title) setPromoTitle(d.promo_title)
          if (d.promo_subtitle) setPromoSub(d.promo_subtitle)
        }
      } catch { /* ok */ }
    })()
  }, [])

  const saveWa = async () => {
    setWaStatus('')
    if (!/^[0-9]{8,15}$/.test(wa.trim())) { setWaStatus('Nomor WA tidak valid — hanya angka, 8-15 digit'); return }
    const ok = await updateSettings({ wa_number: wa.trim() })
    setWaStatus(ok ? '✅ Nomor WhatsApp tersimpan' : '❌ Gagal menyimpan')
  }

  const saveTexts = async () => {
    setTextStatus('')
    const ok = await updateSettings({ tagline: tagline.trim() || ' ', promo_title: promoTitle.trim() || ' ', promo_subtitle: promoSub.trim() || ' ' })
    setTextStatus(ok ? '✅ Tulisan tersimpan' : '❌ Gagal menyimpan')
  }

  const savePass = async () => {
    setPassStatus('')
    if (newPass.length < 6) { setPassStatus('Password baru minimal 6 karakter'); return }
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ old_password: oldPass, new_password: newPass }), credentials: 'include',
      })
      const d = await res.json()
      if (res.ok) { setPassStatus('✅ Password berhasil diubah'); setOldPass(''); setNewPass('') }
      else setPassStatus(d.error || 'Gagal mengubah password')
    } catch { setPassStatus('Gagal mengubah password — cek koneksi') }
  }

  const input = 'w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary outline-none text-sm'

  return (
    <div className="mt-6 max-w-2xl space-y-5">
      {/* Info akun */}
      <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-primary to-primaryDark rounded-full flex items-center justify-center text-2xl text-white">{user?.name?.[0]?.toUpperCase() || '👤'}</div>
        <div>
          <p className="font-bold text-slate-900">{user?.name || 'Admin'}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <span className="text-[11px] mt-1 inline-block bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Admin</span>
        </div>
      </div>

      {/* Ganti nomor WA */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-slate-900 mb-1">📱 Nomor WhatsApp</h3>
        <p className="text-xs text-slate-500 mb-3">Nomor ini dipakai tombol "Hubungi Kami" di detail pesanan pelanggan.</p>
        <input value={wa} onChange={e => setWa(e.target.value)} placeholder="6281234567890" className={input} inputMode="numeric" />
        {waStatus && <p className={`text-xs mt-2 ${waStatus.includes('✅') ? 'text-green-600' : 'text-red-500'}`}>{waStatus}</p>}
        <button onClick={saveWa} className="mt-3 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">Simpan Nomor WA</button>
      </div>

      {/* Atur tulisan */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <h3 className="font-bold text-slate-900 mb-1">✍️ Atur Tulisan</h3>
        <p className="text-xs text-slate-500 mb-2">Tagline & banner promo yang tampil di Beranda dan Login. Gaya/CSS tidak berubah, hanya teksnya.</p>
        <div>
          <label className="text-xs font-medium text-slate-500">Tagline</label>
          <input value={tagline} onChange={e => setTagline(e.target.value)} className={`${input} mt-1`} placeholder="Cuci Bersih, Hidup Lebih Praktis" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Banner Promo — Judul</label>
          <input value={promoTitle} onChange={e => setPromoTitle(e.target.value)} className={`${input} mt-1`} placeholder="Diskon 20%" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-500">Banner Promo — Subjudul</label>
          <input value={promoSub} onChange={e => setPromoSub(e.target.value)} className={`${input} mt-1`} placeholder="untuk Order Pertama" />
        </div>
        {textStatus && <p className={`text-xs ${textStatus.includes('✅') ? 'text-green-600' : 'text-red-500'}`}>{textStatus}</p>}
        <button onClick={saveTexts} className="bg-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">Simpan Tulisan</button>
      </div>

      {/* Ganti password */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-slate-900 mb-3">🔑 Ubah Password</h3>
        <input type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="Password lama" className={`${input} mb-3`} />
        <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Password baru (min. 6 karakter)" className={input} />
        {passStatus && <p className={`text-xs mt-2 ${passStatus.includes('✅') ? 'text-green-600' : 'text-red-500'}`}>{passStatus}</p>}
        <button onClick={savePass} className="mt-3 bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">Ubah Password</button>
      </div>
    </div>
  )
}

function QrisSettings() {
  const { qris, setQris } = useConfigStore()
  const [draft, setDraft] = useState(qris)
  const [saved, setSaved] = useState(false)
  const save = () => { setQris(draft); setSaved(true); setTimeout(() => setSaved(false), 2000) }
  const input = 'w-full border-2 border-slate-100 rounded-xl p-3 text-sm focus:border-primary outline-none'
  return (
    <div className="mt-6 max-w-[640px]">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-slate-900">Pengaturan Pembayaran QRIS</h2>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={draft.enabled} onChange={e => setDraft({ ...draft, enabled: e.target.checked })} className="w-5 h-5 accent-[#2563EB]" />
          Aktif
        </label>
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700">Nama Merchant</label>
          <input className={input} value={draft.merchant} onChange={e => setDraft({ ...draft, merchant: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Nama Akun / Pemilik</label>
          <input className={input} value={draft.accountName} onChange={e => setDraft({ ...draft, accountName: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Nomor Referensi / NID QRIS</label>
          <input className={input} value={draft.accountNumber} onChange={e => setDraft({ ...draft, accountNumber: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">String / Data QRIS (EMVCo)</label>
          <textarea className={`${input} font-mono text-xs h-28`} value={draft.qrPayload} onChange={e => setDraft({ ...draft, qrPayload: e.target.value })} placeholder="Tempel string QRIS dari penyedia Anda..." />
          <p className="text-[11px] text-slate-400 mt-1">Kode QR pelanggan dibuat dari string ini. Jika kosong, otomatis dibangun dari nomor referensi di atas.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={save} className="bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-md shadow-primary/25">{saved ? '✓ Tersimpan' : 'Simpan Pengaturan'}</button>
          {saved && <span className="text-green-600 text-sm">Pengaturan QRIS diperbarui!</span>}
        </div>
      </div>
    </div>
  )
}