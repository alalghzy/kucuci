import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useServiceStore } from '../stores/useServiceStore'
import { useOrderStore } from '../stores/useOrderStore'
import { useNotificationStore } from '../stores/useNotificationStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { iconFor, rupiah, formatDate, statusLabel, statusColor } from '../lib/format'

export default function Beranda() {
  const { services, load } = useServiceStore()
  const orders = useOrderStore(s => s.orders)
  const notifications = useNotificationStore(s => s.notifications)
  const loadNotifications = useNotificationStore(s => s.load)
  const { user } = useAuthStore()
  const { settings, load: loadSettings } = useSettingsStore()
  const nav = useNavigate()

  useEffect(() => { load(); loadNotifications(); loadSettings() }, [load, loadNotifications, loadSettings])

  // Refresh realtime: muat ulang order & notif dari server berkala (biar status selalu up-to-date)
  useEffect(() => {
    const refresh = () => {
      fetch('/api/orders?mine=1').then(r => r.ok && r.json()).then(d => {
        if (Array.isArray(d)) useOrderStore.getState().setOrders(d)
      }).catch(() => {})
      useNotificationStore.getState().setLoaded(false)
      loadNotifications()
    }
    refresh()
    const iv = setInterval(refresh, 8000)
    return () => clearInterval(iv)
  }, [loadNotifications])

  const active = orders.find(o => !['selesai', 'dibatalkan'].includes(o.status))
    // Tampilkan semua pesanan (termasuk aktif), urut terbaru, ambil 3 teratas
    const recent = [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 3)
  const notifCount = notifications.filter(n => n.is_active && !n.read_at).length
  const name = user?.name?.split(' ')[0] || 'Kamu!'
  const ordered = !!user
  const goOrder = (slug?: string) => {
    const target = slug ? `/buat-pesanan?service=${slug}` : '/buat-pesanan'
    if (ordered) nav(target)
    else nav('/login', { state: { from: target } })
  }

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primaryDark text-white rounded-b-3xl pt-4 px-4 pb-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">🧺</div>
            <div>
              <p className="font-semibold text-sm">Halo, {name} 👋</p>
              <p className="text-xs text-white/70">Bersih maksimal, wangi tahan lama</p>
            </div>
          </div>
          <button onClick={() => nav('/notifikasi')} className="relative w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                      🔔
                      {notifCount > 0 && <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold">{notifCount}</span>}
                    </button>
        </div>

        {/* Banner Diskon */}
        <div className="mt-5 bg-white/15 border border-white/20 backdrop-blur rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-white/80">{settings.tagline}</p>
                    <p className="text-2xl font-extrabold tracking-tight">{settings.promo_title}</p>
                    <p className="text-xs text-white/80 mb-3">{settings.promo_subtitle}</p>
                    <button onClick={() => goOrder()} className="inline-block bg-white text-primary px-4 py-2 rounded-xl text-sm font-semibold shadow-lg hover:bg-teal-50">Pesan Sekarang</button>
                  </div>
                  <span className="text-5xl drop-shadow">🍃</span>
                </div>
      </div>

      {!ordered && (
              <div className="px-4 mt-4">
                <div className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-3 border border-primary/10">
                  <span className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center text-xl">🔐</span>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">Masuk untuk memesan</p>
                    <p className="text-xs text-slate-500">Lihat harga & layanan, lalu login Google untuk melanjutkan.</p>
                  </div>
                  <button onClick={() => nav('/login')} className="bg-primary text-white text-xs px-3 py-2 rounded-xl font-semibold">Login</button>
                </div>
              </div>
            )}

            <div className={ordered ? "-mt-6 px-4" : "mt-6 px-4"}>
              {/* Pesanan Aktif */}
        {ordered && active && (
          <Link to={`/pesanan/${active.id}`} className="block bg-white rounded-2xl shadow-card p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-slate-500">Pesanan Aktif</p>
                  <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />{statusLabel(active.status)}</span>
                </div>
                <p className="font-bold text-slate-900 mt-1">#{active.id}</p>
                <p className="text-sm text-slate-600">{active.service_name} • {active.weight ? `${active.weight} Kg` : `${active.qty} ${active.unit}`}</p>
                <p className="text-xs text-slate-400 mt-0.5">Selesai: {formatDate(active.finish_date)}</p>
              </div>
              <span className="text-3xl ml-3">{iconFor({ icon_name: active.service_name })}</span>
            </div>
          </Link>
        )}
        {ordered && !active && (
          <div className="bg-white rounded-2xl shadow-card p-4 mb-4 text-center">
            <p className="text-slate-500 text-sm">Belum ada pesanan aktif</p>
            <button onClick={() => goOrder()} className="inline-block mt-2 bg-primary text-white text-sm px-4 py-2 rounded-xl font-semibold">Buat Pesanan</button>
          </div>
        )}
      </div>

      {/* Layanan Kami */}
      <div className="px-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-bold text-lg text-slate-900">Layanan Kami</h2>
          <button onClick={() => goOrder()} className="text-primary text-sm font-medium">Lihat Semua</button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {services.filter(s => s.is_active !== false).map(s => (
            <button key={s.id} onClick={() => goOrder(s.slug)} className="flex flex-col items-center gap-1.5 bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition">
              <span className="w-12 h-12 bg-secondary rounded-2xl flex items-center justify-center text-2xl">{iconFor(s)}</span>
              <span className="text-[11px] leading-tight text-slate-600 text-center line-clamp-2">{s.name}</span>
              <span className="text-[10px] font-bold text-primary">Rp{s.price / 1000}k</span>
            </button>
          ))}
        </div>
      </div>

      {/* Riwayat */}
      {ordered && (
        <div className="px-4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-lg text-slate-900">Riwayat Pesanan</h2>
            <button onClick={() => nav('/pesanan')} className="text-primary text-sm font-medium">Lihat Semua</button>
          </div>
          <div className="space-y-3">
            {recent.length === 0 && <div className="bg-white rounded-2xl p-6 text-center text-sm text-slate-400">Belum ada riwayat pesanan</div>}
            {recent.map(o => (
              <button key={o.id} onClick={() => nav(`/pesanan/${o.id}`)} className="w-full flex items-center justify-between bg-white rounded-2xl p-3.5 shadow-sm hover:shadow-md transition text-left">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-xl">{iconFor({ icon_name: o.service_name })}</span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">#{o.id}</p>
                    <p className="text-xs text-slate-500">{o.service_name} • {o.weight ? `${o.weight} Kg` : `${o.qty} ${o.unit}`}</p>
                  </div>
                </div>
                <div className="text-right">
                                  <p><span className={`inline-block text-[11px] px-2 py-0.5 rounded-full capitalize ${statusColor(o.status)}`}>{statusLabel(o.status)}</span></p>
                                  <p className="text-sm font-bold text-slate-800 mt-1">{rupiah(o.total_price)}</p>
                                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}