import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Service } from '../types/service'
import { mockServices } from '../mocks/services.mock'
import { createSheetDBClient } from '../lib/db/sheetdb.client'

const SHEETDB_URL = import.meta.env.VITE_SHEETDB_URL as string | undefined

interface ServiceState {
  services: Service[]
  loading: boolean
  load: () => Promise<void>
  addService: (data: Omit<Service, 'id' | 'is_active' | 'created_at'>) => void
  updateService: (id: string, patch: Partial<Service>) => void
  removeService: (id: string) => void
  toggleActive: (id: string) => void
}

let loaded = false

export const useServiceStore = create<ServiceState>()(
  persist(
    (set) => ({
      services: mockServices,
      loading: false,
      load: async () => {
        if (loaded) return
        loaded = true
        set({ loading: true })
        try {
          const res = await fetch('/api/services')
          if (res.ok) {
            const parsed = (await res.json()) as Service[]
            if (Array.isArray(parsed) && parsed.length > 0) {
              set({ services: parsed, loading: false })
              return
            }
          }
        } catch { /* fallback ke mock */ }
        // Fallback: coba SheetDB langsung
        if (SHEETDB_URL) {
          try {
            const client = createSheetDBClient(SHEETDB_URL)
            const rows = await client.get<Record<string, string>>('services')
            if (rows && rows.length > 0) {
              const parsed: Service[] = rows.map((r, i) => ({
                id: r.id || `srv-${i + 1}`,
                name: r.name || '',
                slug: r.slug || '',
                description: r.description ?? '',
                price: Number(r.price) || 0,
                unit: (r.unit as Service['unit']) || 'Kg',
                icon_name: r.icon_name || '🧼',
                is_active: String(r.is_active).toUpperCase() !== 'FALSE',
                created_at: r.created_at || new Date().toISOString(),
              }))
              if (parsed.length > 0) set({ services: parsed })
            }
          } catch { /* keep mock */ }
        }
        set({ loading: false })
      },

      addService: (data) => {
        const svc: Service = {
          ...data,
          id: `srv-${Date.now()}`,
          is_active: true,
          created_at: new Date().toISOString(),
        }
        set((s) => ({ services: [...s.services, svc] }))
      },

      updateService: (id, patch) =>
        set((s) => ({
          services: s.services.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      removeService: (id) =>
        set((s) => ({ services: s.services.filter((x) => x.id !== id) })),

      toggleActive: (id) =>
        set((s) => ({
          services: s.services.map((x) => (x.id === id ? { ...x, is_active: !x.is_active } : x)),
        })),
    }),
    { name: 'service-storage' }
  )
)

// --- sinkronisasi perubahan layanan ke backend (Cloudflare /api/services) ---

export async function syncAddService(data: Omit<Service, 'id' | 'is_active' | 'created_at'>): Promise<string | null> {
  try {
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })
    if (res.ok) {
      const svc = await res.json()
      return svc.id ?? null
    }
    return null
  } catch { return null }
}

export async function syncUpdateService(id: string, patch: Partial<Service>): Promise<boolean> {
  try {
    const res = await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
      credentials: 'include',
    })
    return res.ok
  } catch { return false }
}

// helper untuk generate slug dari nama
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// helper untuk pick icon dari nama / slug
export function pickIcon(name: string, slug: string): string {
  const n = name.toLowerCase()
  const s = slug.toLowerCase()
  if (n.includes('setrika') || s.includes('setrika')) return 'iron'
  if (n.includes('kering') || s.includes('kering')) return 'shirt'
  if (n.includes('bed') || n.includes('cover') || s.includes('cover')) return 'bed'
  if (n.includes('sepatu') || n.includes('shoe')) return 'shoe'
  return 'washer'
}