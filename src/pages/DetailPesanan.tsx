import { useParams, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { useOrderStore } from '../stores/useOrderStore'
import { Timeline } from '../components/ui/Timeline'
import { iconFor, rupiah, formatDate, statusLabel } from '../lib/format'
import { waLink } from '../lib/constants'
import { useSettingsStore } from '../stores/useSettingsStore'

export default function DetailPesanan() {
  const { id } = useParams()
  const order = useOrderStore(s => s.orders.find(o => o.id === id))
  const { settings, load } = useSettingsStore()
  useEffect(() => { load() }, [load])
  if (!order) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><span className="text-4xl">🧺</span><p className="text-slate-500">Pesanan tidak ditemukan</p><Link to="/" className="bg-primary text-white px-5 py-2 rounded-xl text-sm font-semibold">Kembali ke Beranda</Link></div>

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 pb-10">
      <div className="bg-gradient-to-br from-primary to-primaryDark text-white pt-4 px-4 pb-14 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-9 h-9 flex items-center justify-center rounded-full bg-white/20">‹</Link>
          <h1 className="font-bold flex-1 text-center">Detail Pesanan</h1>
          <span className="w-9" />
        </div>
        <div className="text-center mt-4">
          <p className="text-xs text-white/70">INVOICE</p>
          <p className="text-xl font-bold tracking-wide">#{order.id}</p>
          <p className="text-xs text-white/70 mt-1">Dipesan {new Date(order.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}</p>
        </div>
      </div>

      <div className="-mt-8 px-4">
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase">Status</p>
            <p className="font-bold text-slate-900 mt-0.5">{statusLabel(order.status)}</p>
          </div>
          <span className="text-5xl">{iconFor({ icon_name: order.service_name })}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5 mb-4">
          <h2 className="font-bold text-slate-900 mb-4">Status Pesanan</h2>
          <Timeline status={order.status} />
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5 mb-4">
          <h2 className="font-bold text-slate-900 mb-3">Detail Pesanan</h2>
          <div className="space-y-3 text-sm">
            {row('Layanan', order.service_name)}
            {row('Nama', order.customer_name || '-')}
            {row('Jumlah', order.weight ? `${order.weight} Kg` : `${order.qty} ${order.unit}`)}
            {row('Metode', order.pickup_method ? (order.pickup_method === 'antar' ? '🚚 Diantar' : '📦 Dijemput') : '-')}
            {row('Jadwal', order.pickup_date ? `${formatDate(order.pickup_date)}${order.pickup_time ? ' pukul ' + order.pickup_time : ''}` : '-')}
            {row('Jadwal Selesai', formatDate(order.finish_date))}
            {row('Catatan', order.notes || 'Tidak ada')}
            <div className="flex justify-between items-center border-t pt-3">
              <span className="text-slate-500">Total</span>
              <b className="text-primary text-lg">{rupiah(order.total_price)}</b>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Metode Bayar</span>
              <b className="text-slate-800">{order.payment_method === 'cod' ? '💵 Bayar di Tempat' : '📱 QRIS'}</b>
            </div>
            {order.address && row('Alamat', order.address)}
          </div>
        </div>

        <a href={waLink(`Halo, saya mau tanya tentang pesanan ${order.id}`, settings.wa_number)} target="_blank" className="flex items-center justify-center gap-2 w-full bg-green-500 text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-green-500/30 hover:bg-green-600 active:scale-[0.99]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Hubungi Kami via WhatsApp
        </a>
      </div>
    </div>
  )
}

function row(label: string, value: string) {
  return <div className="flex justify-between gap-4"><span className="text-slate-500 shrink-0">{label}</span><b className="text-slate-800 text-right">{value}</b></div>
}