import { useState, useEffect } from 'react'
import { useAddressStore, syncAddAddress, syncDeleteAddress } from '../stores/useAddressStore'
import AddressMap from '../components/AddressMap'
import { Button } from '../components/ui/Button'

export default function Alamat() {
  const { addresses, load, add, remove } = useAddressStore()
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // Muat ulang alamat dari D1 (paksa, agar selalu sinkron)
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!address.trim() || address.trim().length < 3) return
    const saved = await syncAddAddress({ label: label.trim() || 'Alamat', address: address.trim(), lat: coords?.lat ?? null, lng: coords?.lng ?? null, created_at: new Date().toISOString() })
    if (saved) {
      add(saved)
      setAddress('')
      setLabel('')
      setCoords(null)
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    await syncDeleteAddress(id)
    remove(id)
    setConfirmId(null)
  }

  return (
    <div className="max-w-[480px] mx-auto min-h-screen bg-slate-50 pb-24">
      <header className="bg-white pt-4 px-4 pb-2 rounded-b-2xl shadow-sm">
        <h1 className="font-bold text-lg text-center text-slate-900">Alamat Saya</h1>
        <p className="text-center text-xs text-slate-400 mt-0.5">Kelola alamat tersimpan ({addresses.length})</p>
      </header>

      <div className="p-4 space-y-4">
        {/* Tombol tambah */}
        {!adding ? (
          <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-2xl font-semibold shadow-lg shadow-primary/30 hover:opacity-90">
            + Tambah Alamat
          </button>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-4 space-y-3">
            <h3 className="font-bold text-slate-800">Tambah Alamat Baru</h3>
            <AddressMap onAddress={setAddress} onPick={(lat, lng) => setCoords({ lat, lng })} />
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Detail alamat…"
              className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary outline-none text-sm"
              rows={2}
            />
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Label (Rumah / Kantor / Kos)"
              className="w-full border-2 border-slate-100 rounded-xl p-3 focus:border-primary outline-none text-sm"
            />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setAdding(false); setAddress(''); setLabel('') }} className="flex-1">Batal</Button>
              <Button onClick={handleSave} disabled={!address.trim() || address.trim().length < 3} className="flex-1">Simpan</Button>
            </div>
          </div>
        )}

        {/* Daftar alamat tersimpan */}
        {addresses.length === 0 && !adding ? (
          <div className="bg-white rounded-2xl shadow-card p-8 text-center">
            <span className="text-5xl">📍</span>
            <p className="font-bold text-slate-800 mt-3">Belum ada alamat tersimpan</p>
            <p className="text-sm text-slate-500 mt-1">Tambahkan alamat agar mudah memilih saat memesan.</p>
          </div>
        ) : (
          addresses.map(a => (
            <div key={a.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center text-lg shrink-0">📍</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 capitalize">{a.label || 'Alamat'}</span>
                  {a.lat != null && <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">Peta</span>}
                </div>
                <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{a.address}</p>
                <p className="text-[11px] text-slate-400 mt-1">{new Date(a.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <button onClick={() => setConfirmId(a.id)} className="text-xs text-red-400 border border-red-100 rounded-lg px-2.5 py-1.5 hover:bg-red-50 hover:text-red-500 shrink-0">Hapus</button>
            </div>
          ))
        )}
      </div>

      {/* Modal konfirmasi hapus */}
      {confirmId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center">
            <div className="w-14 h-14 mx-auto bg-red-50 rounded-full flex items-center justify-center text-2xl">🗑️</div>
            <h3 className="font-bold text-slate-900 mt-4">Hapus alamat?</h3>
            <p className="text-sm text-slate-500 mt-1">Alamat ini akan dihapus dari daftar tersimpan Anda.</p>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setConfirmId(null)} className="flex-1 py-2.5 rounded-xl border-2 border-slate-100 text-slate-500 text-sm font-semibold">Batal</button>
              <button onClick={() => handleDelete(confirmId)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}