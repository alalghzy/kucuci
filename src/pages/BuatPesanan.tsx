import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Navigate, useLocation } from 'react-router-dom'
import { Stepper } from '../components/ui/Stepper'
import { Button } from '../components/ui/Button'
import { useWizardStore } from '../stores/useWizardStore'
import { useOrderStore } from '../stores/useOrderStore'
import { useAuthStore } from '../stores/useAuthStore'
import { useServiceStore } from '../stores/useServiceStore'
import { createSheetDBClient } from '../lib/db/sheetdb.client'
import { QrisSummary } from '../components/ui/QrisSummary'
import AddressMap from '../components/AddressMap'
import { useAddressStore, syncAddAddress } from '../stores/useAddressStore'
import { pushOrder } from '../stores/useOrderStore'
import type { Service } from '../types/service'
import type { OrderStatus } from '../types/order'

const SHEETDB_URL = import.meta.env.VITE_SHEETDB_URL as string | undefined
const MIN_DATE = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

export default function BuatPesanan() {
  const [params] = useSearchParams()
  const nav = useNavigate()
  const loc = useLocation()
  const wizard = useWizardStore()
  const { addOrder } = useOrderStore()
  const { user } = useAuthStore()
  const { services } = useServiceStore()
  const { addresses, load: loadAddresses } = useAddressStore()
  const [saveAddr, setSaveAddr] = useState(false)
  const [addrLabel, setAddrLabel] = useState('')
  const [mapAddr, setMapAddr] = useState<{ address: string; lat: number; lng: number } | null>(null)
  const step = wizard.step
  const preselect = params.get('service')
  const [error, setError] = useState('')

  useEffect(() => { loadAddresses() }, [loadAddresses])
  useEffect(() => {
    if (preselect && !wizard.serviceId) {
      const svc = services.find(s => s.slug === preselect)
      if (svc) wizard.set({ serviceId: svc.id })
    }
  }, [preselect, services]) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = services.find(s => s.id === wizard.serviceId)
  const qty = selected?.unit === 'Kg' ? wizard.weight : wizard.qty
  const total = selected ? selected.price * Math.max(1, qty || 0) : 0

  const setStepFn = (n: number) => wizard.set({ step: n })
  const next = () => {
    if (!selected) return
    if (step === 1 && !wizard.serviceId) { setError('Pilih layanan terlebih dahulu'); return }
    if (step === 2 && (!qty || qty < 1)) { setError('Masukkan jumlah yang valid'); return }
    if (step === 3) {
      if (!wizard.pickup_date) { setError('Pilih tanggal'); return }
      if (!wizard.address || wizard.address.trim().length < 5) { setError('Isi alamat lengkap (min. 5 karakter)'); return }
      if (!wizard.payment_method) { setError('Pilih metode pembayaran'); return }
    }
    setError('')
    setStepFn(Math.min(4, step + 1))
  }

  const submit = async () => {
    if (!selected) return
    const id = `INV-${new Date().toISOString().slice(2,10).replace(/-/g,'')}${String(Date.now()).slice(-4)}`
    const isQris = wizard.payment_method === 'qris'
    const order = {
      id,
      user_id: user?.id ?? 'u1',
      user_email: user?.email ?? 'aisyah@gmail.com',
      service_id: selected.id,
      service_name: selected.name,
      unit: selected.unit,
      weight: selected.unit === 'Kg' ? wizard.weight : undefined,
      qty: selected.unit !== 'Kg' ? wizard.qty : undefined,
      total_price: total,
      status: (isQris ? 'menunggu_pembayaran' : 'diterima') as OrderStatus,
      payment_method: wizard.payment_method,
      pickup_method: wizard.pickup_method,
      pickup_date: wizard.pickup_date,
      finish_date: new Date(Date.now() + 2*86400000).toISOString(),
      notes: wizard.notes,
      customer_name: wizard.customer_name || user?.name?.split(' ')[0] || 'Pelanggan',
      pickup_time: wizard.pickup_time,
      address: wizard.address,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    addOrder(order)
    // Kirim ke backend (Cloudflare /api/orders -> D1)
    const pushed = await pushOrder(order)
    if (!pushed) {
      // Fallback: SheetDB langsung (kode lama)
      if (SHEETDB_URL) {
        try {
          const client = createSheetDBClient(SHEETDB_URL)
          await client.post('orders', order as unknown as Record<string, unknown>)
          await client.post('order_history', { id: `hist-${Date.now()}`, order_id: id, status: order.status, timestamp: new Date().toISOString(), note: 'Pesanan Diterima', changed_by: order.user_email } as Record<string, unknown>)
        } catch (e) { console.warn('SheetDB save failed', e) }
      }
    }
    // Simpan alamat jika dicentang (multi-alamat) — sertakan koordinat dari peta
    if (saveAddr && wizard.address?.trim()) {
      const saved = await syncAddAddress({ label: addrLabel.trim() || 'Alamat', address: wizard.address.trim(), lat: mapAddr?.lat ?? null, lng: mapAddr?.lng ?? null, created_at: new Date().toISOString() })
      if (saved) useAddressStore.getState().add(saved)
    }
    wizard.reset()
    // QRIS -> menuju halaman pembayaran (QR + polling); COD -> langsung detail
    if (isQris) nav(`/pembayaran/${id}`)
    else nav(`/pesanan/${id}`)
  }

  const stepNav = (
    <div className="flex gap-3 mt-6">
      {step > 1 && <Button variant="outline" onClick={() => setStepFn(Math.max(1, step - 1))} className="flex-1">‹ Kembali</Button>}
      <Button disabled={!selected} onClick={step === 4 ? submit : next} className="flex-1">
        {step === 4 ? 'Buat Pesanan' : 'Lanjutkan ›'}
      </Button>
    </div>
  )

  if (!user) {
    return <Navigate to="/login" state={{ from: `${loc.pathname}${loc.search}` }} replace />
  }

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-white pb-20 shadow-card">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => step === 1 ? nav('/') : setStepFn(step - 1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 text-xl text-slate-600">‹</button>
          <h1 className="font-bold text-lg flex-1 text-center text-slate-800">Buat Pesanan</h1>
          <span className="w-9" />
        </div>
        <Stepper step={step} />
      </header>

      {error && <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl">{error}</div>}

      {step === 1 && (
        <div className="p-4">
          <h2 className="font-bold text-slate-800 mb-3">Pilih Layanan</h2>
          <div className="space-y-3">
            {services.filter(s => s.is_active !== false).map(s => (
              <button key={s.id} type="button" onClick={() => { wizard.set({ serviceId: s.id }); setError('') }}
                className={`w-full flex items-center gap-3 p-3 border-2 rounded-2xl text-left transition cursor-pointer ${wizard.serviceId === s.id ? 'border-primary bg-blue-50' : 'border-slate-100 hover:border-primary/40 bg-white'}`}>
                <span className="text-2xl w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">{iconFor(s)}</span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-slate-800">{s.name}</span>
                  <span className="text-xs text-slate-400">Mulai dari</span>
                </span>
                <span className="text-sm font-bold text-primary">Rp {s.price.toLocaleString('id-ID')}<span className="text-slate-400 font-normal text-xs"> / {s.unit}</span></span>
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] text-white ${wizard.serviceId === s.id ? 'bg-primary border-primary' : 'border-slate-300'}`}>{wizard.serviceId === s.id ? '✓' : ''}</span>
              </button>
            ))}
          </div>
          {stepNav}
        </div>
      )}

      {step === 2 && selected && (
        <div className="p-4 space-y-4">
          <h2 className="font-bold text-slate-800">Detail Pesanan</h2>
          <div className="bg-blue-50 rounded-2xl p-3 flex items-center gap-3">
            <span className="text-2xl">{iconFor(selected)}</span>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{selected.name}</p>
              <p className="text-xs text-slate-500">Rp {selected.price.toLocaleString('id-ID')} / {selected.unit}</p>
            </div>
            <button onClick={() => setStepFn(1)} className="text-primary text-xs font-semibold">Ganti</button>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">{selected.unit === 'Kg' ? 'Berat (Kg)' : `Jumlah (${selected.unit})`}</label>
            <div className="flex items-center gap-2 mt-1.5">
              <button onClick={() => wizard.set(selected.unit === 'Kg' ? { weight: Math.max(1, wizard.weight - 1) } : { qty: Math.max(1, wizard.qty - 1) })} className="w-10 h-10 rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200">−</button>
              <input type="number" min={1} value={qty} onChange={e => { const v = Number(e.target.value); if (selected.unit === 'Kg') wizard.set({ weight: v }); else wizard.set({ qty: v }) }} className="w-full text-center text-lg font-bold border-2 border-slate-100 rounded-xl py-2 focus:border-primary outline-none" />
              <button onClick={() => wizard.set(selected.unit === 'Kg' ? { weight: wizard.weight + 1 } : { qty: wizard.qty + 1 })} className="w-10 h-10 rounded-full bg-blue-100 font-bold text-primary hover:bg-blue-200">+</button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Catatan</label>
            <textarea value={wizard.notes} onChange={e => wizard.set({ notes: e.target.value })} placeholder="Contoh: pisahkan pakaian putih" className="w-full border-2 border-slate-100 rounded-xl p-3 mt-1.5 focus:border-primary outline-none text-sm" rows={3} />
          </div>

          <div className="bg-blue-50 p-3 rounded-xl flex justify-between items-center">
            <span className="text-sm text-slate-600">Estimasi Total</span><span className="font-bold text-lg text-primary">Rp {total.toLocaleString('id-ID')}</span>
          </div>
          {stepNav}
        </div>
      )}

      {step === 3 && (
        <div className="p-4 space-y-4">
          <h2 className="font-bold text-slate-800">Jadwal & Pengiriman</h2>

          {/* Nama pengguna (auto-isi nama awal, bisa diedit) */}
          <div>
            <label className="text-sm font-medium text-slate-700">Nama</label>
            <input
              type="text"
              defaultValue={user?.name?.split(' ')[0] || ''}
              key={user?.name}
              onChange={e => wizard.set({ customer_name: e.target.value })}
              placeholder="Nama Anda"
              className="w-full border-2 border-slate-100 rounded-xl p-3 mt-1.5 focus:border-primary outline-none"
            />
          </div>

          {/* Tanggal Jemput/Antar */}
          <div>
            <label className="text-sm font-medium text-slate-700">Tanggal {wizard.pickup_method === 'jemput' ? 'Jemput' : 'Antar'}</label>
            <input type="date" min={MIN_DATE} value={wizard.pickup_date} onChange={e => wizard.set({ pickup_date: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl p-3 mt-1.5 focus:border-primary outline-none" />
          </div>

          {/* Pukul berapa */}
          <div>
            <label className="text-sm font-medium text-slate-700">Pukul {wizard.pickup_method === 'jemput' ? 'Jemput' : 'Antar'}</label>
            <input type="time" value={wizard.pickup_time} onChange={e => wizard.set({ pickup_time: e.target.value })} className="w-full border-2 border-slate-100 rounded-xl p-3 mt-1.5 focus:border-primary outline-none" />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Metode</label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              {([['jemput','🚚 Dijemput'],['antar','📦 Diantar']] as const).map(([m, label]) => (
                <button key={m} type="button" onClick={() => wizard.set({ pickup_method: m })} className={`flex flex-col items-center gap-1 border-2 rounded-2xl p-4 transition ${wizard.pickup_method === m ? 'border-primary bg-secondary text-primary' : 'border-slate-100 text-slate-500'}`}>
                  <span className="text-2xl">{label.split(' ')[0]}</span>
                  <span className="text-sm font-medium">{label.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Alamat hanya muncul saat Dijemput */}
          {wizard.pickup_method === 'jemput' && (
            <div>
              <label className="text-sm font-medium text-slate-700">Alamat Penjemputan</label>

              {/* Dropdown alamat tersimpan */}
              {addresses.length > 0 && (
                <div className="mt-1.5 mb-2">
                  <select
                    defaultValue=""
                    onChange={(e) => { const a = addresses.find(x => x.id === e.target.value); if (a) { wizard.set({ address: a.address }); setMapAddr(a.lat != null && a.lng != null ? { address: a.address, lat: a.lat, lng: a.lng } : null) } }}
                    className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary outline-none text-sm bg-white"
                  >
                    <option value="">-- Pilih alamat tersimpan --</option>
                    {addresses.map(a => (
                      <option key={a.id} value={a.id}>{a.label ? `${a.label} — ` : ''}{a.address.slice(0, 60)}</option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {addresses.map(a => (
                      <button
                        key={a.id} type="button"
                        onClick={(e) => { e.preventDefault(); wizard.set({ address: a.address }); setMapAddr(a.lat != null && a.lng != null ? { address: a.address, lat: a.lat, lng: a.lng } : null) }}
                        className="text-[11px] bg-slate-50 border border-slate-200 text-slate-500 rounded-full px-2.5 py-1 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      >📍 {a.label || 'Alamat'}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Peta OSM */}
              <AddressMap
                onAddress={(t) => wizard.set({ address: t })}
                onPick={(lat, lng) => setMapAddr(prev => prev ? { ...prev, lat, lng } : { address: wizard.address || '', lat, lng })}
                controlledPos={mapAddr ? { lat: mapAddr.lat, lng: mapAddr.lng } : null}
              />

              <textarea
                value={wizard.address}
                onChange={e => wizard.set({ address: e.target.value })}
                placeholder="Contoh: Jl. Merdeka No. 12, Bandung (lengkapi nama jalan, kelurahan, patokan)"
                className="w-full border-2 border-slate-100 rounded-xl p-3 mt-2 focus:border-primary outline-none text-sm"
                rows={3}
              />

              {/* Simpan alamat */}
              <div className="mt-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={saveAddr} onChange={e => setSaveAddr(e.target.checked)} className="w-5 h-5 accent-[#0D9488]" />
                  Simpan alamat ini
                </label>
                {saveAddr && (
                  <input value={addrLabel} onChange={e => setAddrLabel(e.target.value)} placeholder="Label contoh: Rumah, Kantor, Kos" className="w-full border-2 border-slate-100 rounded-xl p-3 mt-2 focus:border-primary outline-none text-sm" />
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-slate-700">Metode Pembayaran</label>
            <div className="mt-1.5 grid grid-cols-2 gap-3">
              {([
                ['qris', '📱', 'QRIS', 'Bayar instan via e-wallet / m-banking'],
                ['cod', '💵', 'Bayar di Tempat', 'Bayar pas laundry diantar/jemput'],
              ] as const).map(([m, icon, title, desc]) => (
                <button key={m} type="button" onClick={() => wizard.set({ payment_method: m })}
                  className={`flex flex-col items-start gap-1 border-2 rounded-2xl p-4 text-left transition ${wizard.payment_method === m ? 'border-primary bg-secondary' : 'border-slate-100'}`}>
                  <span className="text-xl">{icon}</span>
                  <p className={`font-semibold text-sm ${wizard.payment_method === m ? 'text-primary' : 'text-slate-800'}`}>{title}</p>
                  <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">{wizard.payment_method === 'qris' ? 'Kode QR akan ditampilkan di halaman konfirmasi.' : 'Anda membayar tunai saat pesanan sampai / dijemput.'}</p>
          </div>
          {stepNav}
        </div>
      )}

      {step === 4 && selected && (
        <div className="p-4 space-y-4">
          <h2 className="font-bold text-slate-800">Konfirmasi</h2>
          <div className="border-2 border-slate-100 rounded-2xl overflow-hidden">
            <div className="bg-blue-50 p-3 flex items-center gap-3">
              <span className="text-2xl">{iconFor(selected)}</span>
              <div><p className="font-semibold text-slate-800">{selected.name}</p><p className="text-xs text-slate-500">Rp {selected.price.toLocaleString('id-ID')} / {selected.unit}</p></div>
            </div>
            <div className="p-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Jumlah</span><b className="text-slate-800">{qty} {selected.unit}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Tanggal</span><b className="text-slate-800">{wizard.pickup_date}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Jemput/Diantar</span><b className="text-slate-800 capitalize">{wizard.pickup_method === 'jemput' ? '🚚 Dijemput' : '📦 Diantar'}</b></div>
              {wizard.address && (
                <div className="flex justify-between gap-3"><span className="text-slate-500 shrink-0">Alamat</span><b className="text-slate-800 text-right">{wizard.address}</b></div>
              )}
              <div className="flex justify-between"><span className="text-slate-500">Pembayaran</span><b className="text-slate-800">{wizard.payment_method === 'qris' ? '📱 QRIS' : '💵 Bayar di Tempat'}</b></div>
              <div className="flex justify-between"><span className="text-slate-500">Catatan</span><b className="text-slate-800 text-right">{wizard.notes || 'Tidak ada'}</b></div>
              <div className="flex justify-between border-t pt-2.5 mt-2 text-base"><span className="font-semibold text-slate-800">Total</span><b className="text-primary text-xl">Rp {total.toLocaleString('id-ID')}</b></div>
            </div>
          </div>

          {wizard.payment_method === 'qris' && <QrisSummary amount={total} />}
          {wizard.payment_method === 'cod' && (
            <div className="bg-secondary border-2 border-primary/30 rounded-2xl p-4 text-sm">
              <p className="font-semibold text-primary">💵 Bayar di Tempat (COD)</p>
              <p className="text-slate-600 mt-1">Siapkan pembayaran tunai sebesar <b>Rp {total.toLocaleString('id-ID')}</b> saat laundry {wizard.pickup_method === 'jemput' ? 'dijemput' : 'diantar'}.</p>
            </div>
          )}

          {stepNav}
        </div>
      )}
    </div>
  )
}

function iconFor(s: Service): string {
  const icons: Record<string, string> = { washer: '🫧', shirt: '👕', iron: '👗', bed: '🛏️', shoe: '👟', 'cuci-setrika': '🧺', 'cuci-kering': '🌬️', 'setrika-saja': '🧷', 'bed-cover': '🛏️', sepatu: '👟' }
  return icons[s.icon_name] || icons[s.slug] || '🧼'
}