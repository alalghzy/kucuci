import { Link, useNavigate } from 'react-router-dom'
import { useOrderStore } from '../stores/useOrderStore'
import { iconFor, rupiah, statusLabel, statusColor } from '../lib/format'
import { useState } from 'react'

const tabs = [
  { key: 'semua', label: 'Semua' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'selesai', label: 'Selesai' },
  { key: 'dibatalkan', label: 'Dibatalkan' },
]

export default function Pesanan() {
  const orders = useOrderStore(s => s.orders)
  const [tab, setTab] = useState('semua')
  const nav = useNavigate()

  const filtered = orders.filter(o =>
    tab === 'semua' ? true
    : tab === 'aktif' ? !['selesai', 'dibatalkan'].includes(o.status)
    : o.status === tab)
  const sorted = [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const counts = {
    semua: orders.length,
    aktif: orders.filter(o => !['selesai', 'dibatalkan'].includes(o.status)).length,
    selesai: orders.filter(o => o.status === 'selesai').length,
    dibatalkan: orders.filter(o => o.status === 'dibatalkan').length,
  }

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 pb-24">
      <header className="bg-white pt-4 px-4 pb-2 rounded-b-2xl shadow-sm">
        <h1 className="font-bold text-lg text-center text-slate-900">Pesanan Saya</h1>
        <div className="flex gap-1.5 mt-4 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-full text-sm font-semibold transition ${tab === t.key ? 'bg-primary text-white shadow-md shadow-primary/30' : 'text-slate-500 hover:bg-slate-50'}`}>
              {t.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-400'}`}>{counts[t.key as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {sorted.length === 0 && <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-sm">Belum ada pesanan</div>}
        {sorted.map(o => (
          <button key={o.id} onClick={() => nav(`/pesanan/${o.id}`)} className="w-full flex items-center justify-between bg-white rounded-2xl p-3.5 shadow-sm hover:shadow-md transition text-left">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 bg-blue-50 rounded-xl flex items-center justify-center text-xl">{iconFor({ icon_name: o.service_name })}</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">#{o.id}</p>
                <p className="text-xs text-slate-500">{o.service_name} • {o.weight ? `${o.weight} Kg` : `${o.qty} ${o.unit}`}</p>
                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full capitalize ${statusColor(o.status)}`}>{statusLabel(o.status)}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-slate-800">{rupiah(o.total_price)}</p>
              <p className="text-primary text-xs mt-1">Detail ›</p>
            </div>
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        <Link to="/buat-pesanan" className="flex items-center justify-center gap-2 bg-primary text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-primary/30">+ Buat Pesanan Baru</Link>
      </div>
    </div>
  )
}