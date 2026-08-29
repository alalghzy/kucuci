const steps = [
  { key: 'diterima', label: 'Pesanan Diterima', desc: 'Pesanan Anda telah kami terima' },
  { key: 'dicuci', label: 'Sedang Dicuci', desc: 'Pakaian sedang dalam proses cuci' },
  { key: 'pengeringan', label: 'Pengeringan', desc: 'Pakaian sedang dikeringkan' },
  { key: 'setrika', label: 'Setrika', desc: 'Pakaian sedang disetrika' },
  { key: 'siap', label: 'Siap Diambil / Diantar', desc: 'Pesanan siap untuk diambil / diantar' },
]

export function Timeline({ status }: { status: string }) {
  const idx = steps.findIndex(s => s.key === status)
  const current = idx === -1 ? 1 : idx
  return (
    <div className="relative">
      <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-slate-100" />
      <div className="absolute left-[15px] top-2 h-2 w-0.5 bg-green-100" style={{ height: current === 0 ? 0 : `${(current / (steps.length - 1)) * 100}%` }} />
      <div className="space-y-3">
        {steps.map((s, i) => {
          const done = i < current
          const active = i === current
          return (
            <div key={s.key} className="flex items-start gap-3">
              <span className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 ${done ? 'bg-green-500 border-green-500 text-white' : active ? 'bg-primary border-primary text-white shadow-lg shadow-primary/40' : 'bg-white border-slate-200 text-slate-300'}`}>
                {done ? '✓' : i + 1}
              </span>
              <div className="flex-1 pt-1">
                <p className={`text-sm font-medium ${active ? 'text-primary' : done ? 'text-green-600' : 'text-slate-400'}`}>{s.label}</p>
                <p className="text-xs text-slate-400">{active || done ? s.desc : 'Menunggu'}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}