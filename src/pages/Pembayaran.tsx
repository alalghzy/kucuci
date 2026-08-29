import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { useOrderStore } from '../stores/useOrderStore'
import { rupiah } from '../lib/format'

// Halaman Pembayaran QRIS (Midtrans)
// Menampilkan QR, polling status. Sudah bayar -> redirect ke detail pesanan.
export default function Pembayaran() {
  const { id } = useParams()
  const nav = useNavigate()
  const order = useOrderStore(s => s.orders.find(o => o.id === id))
  const updateOrder = useOrderStore(s => s.updateOrder)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrUrl, setQrUrl] = useState<{ url: string; ref: string } | null>(null)
  const [err, setErr] = useState('')
  const [status, setStatus] = useState<'charging' | 'pending' | 'settlement' | 'error'>('charging')
  const [chargeDone, setChargeDone] = useState(false)

  // Cek status sekali (dipakai tombol "Saya Sudah Bayar")
  const setRetryNow = async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/payment/status/${id}`)
      if (!res.ok) return
      const d = await res.json()
      if (d.status === 'settlement' || d.order_status === 'diterima') {
        updateOrder(id, { status: 'diterima', payment_status: 'success' })
        setStatus('settlement')
      }
    } catch { /* coba lagi nanti */ }
  }

  // 1) Muat QR: coba charge otomatis (midtrans) -> QR URL. Fallback ke order.qr_url.
  useEffect(() => {
    if (!id || !order || chargeDone) return
    ;(async () => {
      setChargeDone(true)
      try {
        // Jika sudah ada qr_url di order, pakai itu
        if (order.qr_url) {
          setStatus('pending')
          setQrUrl({ url: order.qr_url, ref: order.payment_ref || id })
          return
        }
        const res = await fetch('/api/payment/charge', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: id, gross_amount: order.total_price, customer_name: order.customer_name }),
        })
        const d = await res.json().catch(() => ({}))
        if (!res.ok) {
          // Gateway belum dikonfigurasi (sandbox_only) -> tampilkan pesan, bukan error keras
          if (d.sandbox_only) {
            setErr('Mode sandbox: payment gateway (Midtrans) belum dikonfigurasi. Ini hanya preview QRIS statis — belum tes bayar.')
            // fallback: tampilkan QRIS statis dari anonym
            setStatus('pending')
            setQrUrl({ url: '', ref: id })
            return
          }
          setStatus('error')
          setErr(d.error || 'Gagal membuat pembayaran')
          return
        }
        setStatus('pending')
        setQrUrl({ url: d.qr_url, ref: d.payment_ref || d.order_id || id })
      } catch {
        setStatus('error')
        setErr('Gagal terhubung. Periksa koneksi Anda.')
      }
    })()
  }, [id, order, chargeDone])

  // 2) Polling status — cek tiap 3 detik
  useEffect(() => {
    if (status !== 'pending' || !id) return
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${id}`)
        if (!res.ok) return
        const d = await res.json()
        if (d.status === 'settlement' || d.order_status === 'diterima') {
          clearInterval(iv)
          updateOrder(id, { status: 'diterima', payment_status: 'success', payment_ref: qrUrl?.ref })
          setStatus('settlement')
        }
      } catch { /* network hiccup, coba lagi */ }
    }, 3000)
    return () => clearInterval(iv)
  }, [id, status, qrUrl, updateOrder])

  // 3) Render QR (dari URL midtrans / fallback text)
  useEffect(() => {
    if (!canvasRef.current || !qrUrl || qrUrl.url === '') return
    QRCode.toCanvas(canvasRef.current, qrUrl.url, { width: 200, margin: 1 }, (e) => { if (e) console.warn('QR', e) })
  }, [qrUrl])

  // 4) Setelah settlement -> tunggu 1.2s lalu pergi ke detail
  useEffect(() => {
    if (status === 'settlement') {
      const t = setTimeout(() => nav(`/pesanan/${id}`), 1600)
      return () => clearTimeout(t)
    }
  }, [status, id, nav])

  if (!order) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="text-4xl">🧺</span>
      <p className="font-semibold text-slate-700">Pesanan tidak ditemukan</p>
      <Link to="/" className="text-primary text-sm font-semibold">← Kembali ke Beranda</Link>
    </div>
  )

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 pb-24">
      <header className="bg-white pt-4 px-4 pb-2 rounded-b-2xl shadow-sm">
        <h1 className="font-bold text-lg text-center text-slate-900">Pembayaran</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Status sukses */}
        {status === 'settlement' && (
          <div className="bg-white rounded-2xl shadow-card p-10 text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center text-3xl">✅</div>
            <h2 className="font-bold text-slate-900 text-xl mt-4">Pembayaran Berhasil!</h2>
            <p className="text-sm text-slate-500 mt-1">Pesanan Anda telah dikonfirmasi. Mengalihkan ke detail...</p>
          </div>
        )}

        {/* Menampilkan QR */}
        {status === 'pending' && (
          <>
            <div className="bg-white border-2 border-slate-100 rounded-2xl p-4">
              <div className="text-center">
                <span className="inline-flex items-center gap-1 bg-blue-50 text-primary text-xs font-bold px-3 py-1 rounded-full">📱 QRIS</span>
                <h3 className="font-bold text-slate-900 mt-2">Scan untuk Membayar</h3>
                <p className="text-xs text-slate-500">{order.payment_method === 'qris' ? 'Scan kode QR melalui e-wallet / mobile banking Anda' : ''}</p>
              </div>
              <div className="flex justify-center my-4">
                {qrUrl?.url
                  ? <canvas ref={canvasRef} className="rounded-2xl shadow-inner ring-1 ring-slate-100" />
                  : <p className="text-xs text-slate-400 py-10 px-6 text-center">QR belum tersedia. {(err || 'Memuat pembayaran...')}</p>}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs">Referensi</span>
                  <b className="text-slate-800 font-mono text-sm">{qrUrl?.ref || order.id}</b>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs">Total Pembayaran</span>
                  <b className="text-primary text-lg">{rupiah(order.total_price)}</b>
                </div>
              </div>
              {err && <p className="text-[11px] text-amber-600 text-center mt-3">{err}</p>}
              <p className="text-[11px] text-slate-400 text-center mt-3">Menunggu pembayaran anda... Sistem cek otomatis tiap beberapa detik.</p>
            </div>

            {/* Modal: belum bayar -> selesaikan pembayaran */}
            {status === 'pending' && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
                  <div className="w-14 h-14 mx-auto bg-amber-100 rounded-full flex items-center justify-center text-2xl">⏳</div>
                  <h3 className="font-bold text-slate-900 mt-4 text-lg">Selesaikan Pembayaran</h3>
                  <p className="text-sm text-slate-500 mt-1">Pesanan belum dibayar. Silakan scan kode QR di atas untuk menyelesaikan pembayaran <b>{rupiah(order.total_price)}</b>.</p>
                  <div className="flex gap-2 mt-5">
                    <button onClick={() => setRetryNow()} className="flex-1 py-2.5 rounded-xl border-2 border-slate-100 text-slate-500 text-sm font-semibold">Saya Sudah Bayar</button>
                    <button onClick={() => nav('/pesanan')} className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">Cek Nanti</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <span className="text-4xl">⚠️</span>
            <h2 className="font-bold text-slate-900 mt-3">Gagal Memuat Pembayaran</h2>
            <p className="text-sm text-slate-500 mt-1">{err}</p>
            <button onClick={() => { setChargeDone(false); setStatus('charging'); setErr(''); nav('/pesanan'); setTimeout(() => nav(`/pembayaran/${id}`), 50); }} className="mt-4 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold">Coba Lagi</button>
            <div className="mt-3"><Link to={`/pesanan/${id}`} className="text-primary text-sm font-semibold">Lihat Pesanan</Link></div>
          </div>
        )}

        {status === 'charging' && (
          <div className="bg-white rounded-2xl shadow-card p-12 text-center">
            <div className="mx-auto w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 mt-4">Menyiapkan pembayaran QRIS...</p>
          </div>
        )}
      </div>
    </div>
  )
}