import type { Service } from '../types/service'

export function iconFor(s: Service | { icon_name?: string; slug?: string }): string {
  const icons: Record<string, string> = {
    washer: '🫧', shirt: '👕', iron: '👗', bed: '🛏️', shoe: '👟',
    'cuci-setrika': '🧺', 'cuci-kering': '🌬️', 'setrika-saja': '🧷',
    'bed-cover': '🛏️', sepatu: '👟',
  }
  return icons[s.icon_name || ''] || icons[s.slug || ''] || '🧼'
}

export const rupiah = (n: number) => 'Rp ' + (n || 0).toLocaleString('id-ID')

// Label status bahasa Indonesia (berbagi pakai di Beranda, Pesanan, Detail)
export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    menunggu_pembayaran: 'Menunggu Pembayaran',
    diterima: 'Diterima',
    dicuci: 'Dicuci',
    pengeringan: 'Dikeringkan',
    setrika: 'Disetrika',
    siap: 'Siap Diambil',
    selesai: 'Selesai',
    dibatalkan: 'Dibatalkan',
  }
  return map[s] || s
}

export function statusColor(s: string): string {
  if (s === 'selesai') return 'bg-green-100 text-green-700'
  if (s === 'dibatalkan') return 'bg-red-100 text-red-600'
  if (s === 'menunggu_pembayaran') return 'bg-amber-100 text-amber-700'
  return 'bg-secondary text-primary'
}

export function formatDate(iso?: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}