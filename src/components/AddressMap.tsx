import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Perbaiki ikon marker default (Leaflet v1 tidak memuat ikon dari bundler)
const icon = L.icon({ iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] })

// Klik peta -> tempatkan pin & panggil callback
function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng) } })
  return null
}

// Geser peta ke posisi baru (dipanggil tiap kali pos berubah)
function MoveMap({ lat, lng, moving }: { lat: number; lng: number; moving: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (moving) map.flyTo([lat, lng], 16)
  }, [lat, lng, moving, map])
  return null
}

interface Props {
  onAddress: (text: string) => void
  onPick?: (lat: number, lng: number) => void
  initial?: { lat: number; lng: number }
  // Posisi dari luar (controlled) — contoh: saat pilih alamat tersimpan
  controlledPos?: { lat: number; lng: number } | null
}

export default function AddressMap({ onAddress, onPick, initial, controlledPos }: Props) {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(initial || null)
  const [loading, setLoading] = useState(false)
  const [locErr, setLocErr] = useState('')
  const busyReverse = useRef(false)

  const reverseGeocode = async (lat: number, lng: number) => {
    busyReverse.current = true
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`, { headers: { 'User-Agent': 'KuCuci-Laundry (kucuci.pages.dev)' } })
      const data = await res.json()
      const text = data?.display_name || ''
      if (text) onAddress(text)
    } catch { /* biarkan user isi manual */ } finally {
      busyReverse.current = false
    }
  }

  // Posisi dari luar berubah -> ikutkan peta (tanpa reverse-geocode agar tidak menimpa)
  useEffect(() => {
    if (controlledPos && controlledPos.lat != null && controlledPos.lng != null) {
      setPos({ lat: controlledPos.lat, lng: controlledPos.lng })
    }
  }, [controlledPos])

  const handlePick = async (lat: number, lng: number) => {
    setPos({ lat, lng })
    setLoading(true)
    await reverseGeocode(lat, lng)
    setLoading(false)
    if (onPick) onPick(lat, lng)
  }

  const handleGPS = () => {
    setLocErr('')
    if (!('geolocation' in navigator)) { setLocErr('Browser tidak mendukung lokasi'); return }
    navigator.geolocation.getCurrentPosition(async (p) => {
      const { latitude: lat, longitude: lng } = p.coords
      setPos({ lat, lng })
      setLoading(true)
      await reverseGeocode(lat, lng)
      setLoading(false)
      if (onPick) onPick(lat, lng)
    }, () => setLocErr('Gagal mendapat lokasi. Izinkan akses lokasi atau klik peta.'), { enableHighAccuracy: true })
  }

  const center: [number, number] = pos ? [pos.lat, pos.lng] : [-6.9175, 107.6191] // default Bandung

  return (
    <div>
      <button type="button" onClick={handleGPS} className="w-full mb-2 bg-primary/10 border border-primary/30 text-primary py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/20">
        📍 Pakai Lokasi Saya
      </button>
      {locErr && <p className="text-[11px] text-red-500 mb-1">{locErr}</p>}

      <div className="rounded-2xl overflow-hidden border-2 border-slate-100 h-56 relative">
        <MapContainer center={center} zoom={pos ? 16 : 12} scrollWheelZoom className="w-full h-full z-0">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onPick={handlePick} />
          {pos && <Marker position={[pos.lat, pos.lng]} icon={icon} />}
          {pos && <MoveMap lat={pos.lat} lng={pos.lng} moving />}
        </MapContainer>
        {loading && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/80 text-white text-[11px] px-3 py-1.5 rounded-full z-[500]">Memproses alamat…</div>}
      </div>

      <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
        {pos ? '📍 Lokasi dipilih — alamat otomatis terisi di bawah. Bisa Anda perbaiki.' : 'Tap titik di peta untuk menentukan lokasi, atau gunakan lokasi Anda.'}
      </p>
    </div>
  )
}