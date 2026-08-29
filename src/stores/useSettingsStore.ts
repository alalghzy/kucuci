import { create } from 'zustand'

export interface AppSettings {
  wa_number: string
  tagline: string
  promo_title: string
  promo_subtitle: string
}

interface SettingsState {
  settings: AppSettings
  loaded: boolean
  load: () => Promise<void>
  update: (patch: Partial<AppSettings>) => Promise<boolean>
}

let loaded = false

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { wa_number: '6281234567890', tagline: 'Cuci Bersih, Hidup Lebih Praktis', promo_title: 'Diskon 20%', promo_subtitle: 'untuk Order Pertama' },
  loaded: false,
  load: async () => {
    if (loaded) return
    try {
      const res = await fetch('/api/settings')
      if (res.ok) {
        const d = await res.json()
        set({ settings: { ...get().settings, ...d }, loaded: true })
        loaded = true
      }
    } catch { /* fallback default */ }
  },
  update: async (patch) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch), credentials: 'include',
      })
      if (res.ok) {
        set({ settings: { ...get().settings, ...patch } })
        return true
      }
      return false
    } catch { return false }
  },
}))

// Bantu: paksa reload (dipanggil setelah admin simpan)
export function reloadSettings() { loaded = false }