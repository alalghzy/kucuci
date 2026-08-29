import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

// Ikon SVG monokrom (fill/currentColor) agar seragam — menghilangkan kesan berantakan
const icons = {
  home: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12 3 2 12h3v8h6v-5h2v5h6v-8h3L12 3z" /></svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" /></svg>
  ),
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  const { pathname } = useLocation()
  const active = pathname === to
  return (
    <Link
      to={to}
      className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${active ? 'text-primary' : 'text-slate-400 hover:text-slate-600'}`}
    >
      <span className={active ? '' : 'opacity-60'}>{icon}</span>
      <span>{label}</span>
    </Link>
  )
}

function FabLink() {
  return (
    <Link to="/buat-pesanan" title="Buat Pesanan" className="flex items-center justify-center">
      <span className="w-14 h-14 -mt-7 rounded-full bg-gradient-to-br from-primary to-primaryDark text-white flex items-center justify-center text-2xl shadow-lg shadow-primary/40 ring-4 ring-white hover:scale-105 transition">
        +
      </span>
    </Link>
  )
}

export function BottomNav() {
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'admin'

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30">
      <div className="max-w-[480px] mx-auto">
        {/* 3 kolom: Beranda | + | Akun — selalu simetris, Pesanan via menu Akun */}
        <div className="relative bg-white/95 backdrop-blur border-t border-slate-100 h-[66px] grid grid-cols-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <NavItem to="/" icon={icons.home} label="Beranda" />
          <FabLink />
          <NavItem to="/akun" icon={icons.user} label={isAdmin ? 'Admin' : 'Akun'} />
        </div>
      </div>
    </nav>
  )
}