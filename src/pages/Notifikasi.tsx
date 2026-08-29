import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificationStore } from '../stores/useNotificationStore'

export default function Notifikasi() {
  const { notifications, load, markAllRead, updateNotification } = useNotificationStore()
  const nav = useNavigate()

  useEffect(() => { load() }, [load])

  const active = notifications.filter(n => n.is_active)
  const unread = active.filter(n => !n.read_at)

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 pb-24">
      <header className="bg-white pt-4 px-4 pb-3 rounded-b-2xl shadow-sm flex items-center gap-3">
        <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center text-slate-500 text-xl">‹</button>
        <h1 className="font-bold text-lg text-slate-900 flex-1">Notifikasi</h1>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="text-xs bg-primary text-white px-3 py-1.5 rounded-full font-semibold">
            ✓ Tandai semua dibaca
          </button>
        )}
      </header>

      <div className="p-4">
        {active.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card p-10 text-center">
            <span className="text-5xl">🔔</span>
            <p className="font-bold text-slate-800 mt-3">Belum ada notifikasi</p>
            <p className="text-sm text-slate-500 mt-1">Notifikasi terbaru dari KuCuci akan muncul di sini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map(n => {
              const isRead = !!(n.read_at)
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (n.order_id && n.order_id.startsWith('INV-')) {
                      updateNotification(n.id, { read_at: new Date().toISOString() })
                      nav(`/pesanan/${n.order_id}`)
                    }
                  }}
                  className={`w-full text-left bg-white rounded-2xl shadow-sm p-4 ${isRead ? 'border-l-4 border-transparent opacity-70' : 'border-l-4 border-primary'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${n.type === 'order' ? 'bg-blue-50' : 'bg-secondary'}`}>
                      {n.type === 'order' ? '🧺' : '🔔'}
                    </span>
                    <div className="flex-1">
                      <p className={`font-bold text-slate-900 text-sm ${isRead ? 'font-semibold' : ''}`}>{n.title}</p>
                      <p className="text-[11px] text-slate-400">{new Date(n.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    {!isRead && <span className="w-2 h-2 bg-primary rounded-full" />}
                  </div>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{n.message}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}