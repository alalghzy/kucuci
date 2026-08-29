import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { useConfigStore } from '../../stores/useConfigStore'

export function QrisSummary({ amount }: { amount: number }) {
  const { qris } = useConfigStore()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ref] = useState(() => `LK${Date.now().toString().slice(-8)}`)

  useEffect(() => {
    if (!canvasRef.current) return
    const payload = qris.enabled && qris.qrPayload
      ? qris.qrPayload
      : `00020101021226650014ID.COM.QRIS111${(qris.accountNumber || 'QRIS-LK').toUpperCase()}5204419853033${
          String(Math.round(amount)).padStart(3, '0')
        }5802ID5911${(qris.merchant || 'LaundryKu').toUpperCase()}`
    QRCode.toCanvas(canvasRef.current, payload, { width: 180, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } }, (err) => { if (err) console.warn('QR render', err) })
  }, [qris, amount])

  return (
    <div className="bg-white border-2 border-slate-100 rounded-2xl p-4">
      <div className="text-center">
        <span className="inline-flex items-center gap-1 bg-blue-50 text-primary text-xs font-bold px-3 py-1 rounded-full">📱 QRIS</span>
        <h3 className="font-bold text-slate-900 mt-2">Scan untuk Membayar</h3>
        <p className="text-xs text-slate-500">Scan kode QR melalui e-wallet / mobile banking Anda</p>
      </div>
      <div className="flex justify-center my-4">
        <canvas ref={canvasRef} className="rounded-2xl shadow-inner ring-1 ring-slate-100" />
      </div>
      <div className="space-y-2 text-sm">
        <Cost label="Merchant" value={qris.merchant} />
        <Cost label="Nama Akun" value={qris.accountName} />
        <Cost label="Total Pembayaran" value={'Rp ' + (amount || 0).toLocaleString('id-ID')} bold />
        <Cost label="Referensi" value={ref} mono />
      </div>
      <p className="text-[11px] text-slate-400 text-center mt-3">Gunakan QRIS, metode pembayaran nasional yang instan & aman.</p>
    </div>
  )
}

function Cost({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-500 text-xs">{label}</span>
      <b className={`text-slate-800 ${mono ? 'font-mono' : ''} ${bold ? 'text-primary text-base' : 'text-sm'}`}>{value}</b>
    </div>
  )
}