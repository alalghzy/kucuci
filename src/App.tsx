import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Beranda from './pages/Beranda'
import BuatPesanan from './pages/BuatPesanan'
import DetailPesanan from './pages/DetailPesanan'
import Pembayaran from './pages/Pembayaran'
import Pesanan from './pages/Pesanan'
import Akun from './pages/Akun'
import Notifikasi from './pages/Notifikasi'
import Alamat from './pages/Alamat'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/admin/Dashboard'
import { BottomNav } from './components/layout/BottomNav'

function Layout() {
  const loc = useLocation()
  const hideNav = loc.pathname.startsWith('/buat-pesanan') || loc.pathname.startsWith('/pesanan/') || loc.pathname.startsWith('/admin') || loc.pathname === '/login'
  return (
    <>
      <Routes>
        <Route path="/" element={<Beranda />} />
        <Route path="/pesanan" element={<Pesanan />} />
        <Route path="/buat-pesanan" element={<BuatPesanan />} />
        <Route path="/pesanan/:id" element={<DetailPesanan />} />
        <Route path="/pembayaran/:id" element={<Pembayaran />} />
        <Route path="/akun" element={<Akun />} />
        <Route path="/notifikasi" element={<Notifikasi />} />
        <Route path="/alamat" element={<Alamat />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/kucuci_admin" element={<AdminLogin />} />
        <Route path="*" element={<Beranda />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}