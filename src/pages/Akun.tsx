import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { Button } from '../components/ui/Button'

export default function Akun() {
  const { user, logout } = useAuthStore()
  const { settings, load } = useSettingsStore()
  const nav = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => { load() }, [load])

  const doLogout = () => {
    setConfirmLogout(false)
    logout()
    nav('/login')
  }

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 pb-24">
      <header className="bg-white pt-4 px-4 pb-2 rounded-b-2xl shadow-sm">
        <h1 className="font-bold text-lg text-center text-slate-900">Akun</h1>
      </header>

      {user ? (
        <div className="p-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-card p-6 flex flex-col items-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary to-primaryDark rounded-full flex items-center justify-center text-3xl text-white shadow-lg">{user.name?.[0]?.toUpperCase() || '👤'}</div>
            <p className="font-bold text-lg text-slate-900 mt-3">{user.name}</p>
            <p className="text-sm text-slate-500">{user.email}</p>
            <span className={`mt-2 text-[11px] px-3 py-1 rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role === 'admin' ? 'Admin' : 'Pelanggan'}</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {[
              { icon: '🧾', label: 'Pesanan Saya', to: '/pesanan' },
              { icon: '📍', label: 'Alamat Saya', to: '/alamat' },
              ...(user.role === 'admin' ? [{ icon: '🛠️', label: 'Dashboard Admin', to: '/admin' }] : []),
              { icon: 'wa', label: 'Bantuan / WhatsApp', to: `https://wa.me/${settings.wa_number}` },
            ].map((item, i) => (
              <Link key={item.label} to={item.to} target={item.to.startsWith('http') ? '_blank' : undefined} className={`flex items-center gap-3 p-4 ${i > 0 ? 'border-t border-slate-50' : ''}`}>
                <span className="w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">
                  {item.icon === 'wa'
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    : item.icon}
                </span>
                <span className="text-sm font-medium text-slate-700 flex-1">{item.label}</span>
                <span className="text-slate-300">›</span>
              </Link>
            ))}
          </div>

          <Button variant="outline" onClick={() => setConfirmLogout(true)} className="w-full text-red-500 border-red-200 hover:bg-red-50">Keluar</Button>
        </div>
      ) : (
        <div className="p-4">
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <span className="text-5xl">👤</span>
            <p className="font-bold text-slate-800 mt-3">Belum masuk</p>
            <p className="text-sm text-slate-500 mt-1">Masuk untuk memesan dan melihat riwayat</p>
            <Link to="/login" className="block mt-4 bg-primary text-white py-3 rounded-xl font-semibold shadow-lg shadow-primary/30">Masuk</Link>
          </div>
        </div>
      )}

      {/* Modal konfirmasi logout */}
      {confirmLogout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto bg-red-50 rounded-full flex items-center justify-center text-2xl">🚪</div>
            <h3 className="font-bold text-slate-900 mt-4">Keluar dari akun?</h3>
            <p className="text-sm text-slate-500 mt-1">Anda akan keluar dari akun <b>{user?.email}</b> dan perlu login kembali untuk memesan.</p>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setConfirmLogout(false)} className="flex-1 py-2.5 rounded-xl border-2 border-slate-100 text-slate-500 text-sm font-semibold">Batal</button>
              <button onClick={doLogout} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold">Ya, Keluar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}