export function Stepper({ step }: { step: number }) {
  const steps = ['Layanan', 'Detail', 'Jadwal', 'Konfirmasi']
  return (
    <div className="flex items-center justify-between px-4 py-3">
      {steps.map((s, i) => {
        const n = i + 1
        const active = n === step
        const done = n < step
        return (
          <div key={s} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {i > 0 && <div className={`h-0.5 flex-1 ${done ? 'bg-primary' : 'bg-slate-200'}`} />}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${active ? 'bg-primary text-white border-primary' : done ? 'bg-green-500 text-white border-green-500' : 'bg-white border-slate-300 text-slate-400'}`}>
                {done ? '✓' : n}
              </div>
              {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${n < step ? 'bg-primary' : 'bg-slate-200'}`} />}
            </div>
            <span className={`text-[11px] mt-1 ${active ? 'text-primary font-semibold' : done ? 'text-green-600' : 'text-slate-400'}`}>{s}</span>
          </div>
        )
      })}
    </div>
  )
}
