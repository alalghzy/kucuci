import { create } from 'zustand'
import type { Address } from '../types/address'

interface AddressState {
  addresses: Address[]
  loading: boolean
  load: () => Promise<void>
  add: (a: Address) => void
  remove: (id: string) => void
}

let loaded = false

export const useAddressStore = create<AddressState>()((set) => ({
  addresses: [],
  loading: false,
  load: async () => {
    if (loaded) return
    loaded = true
    set({ loading: true })
    try {
      const res = await fetch('/api/addresses', { credentials: 'include' })
      if (res.ok) {
        const parsed = (await res.json()) as Address[]
        if (Array.isArray(parsed)) set({ addresses: parsed, loading: false })
        else set({ loading: false })
        return
      }
    } catch { /* fallback */ }
    set({ loading: false })
  },
  add: (a) => set((s) => ({ addresses: [...s.addresses, a] })),
  remove: (id) => set((s) => ({ addresses: s.addresses.filter((x) => x.id !== id) })),
}))

export function resetAddressLoaded() { loaded = false }

export async function syncAddAddress(data: Omit<Address, 'id'>): Promise<Address | null> {
  try {
    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })
    if (res.ok) return await res.json()
    return null
  } catch { return null }
}

export async function syncDeleteAddress(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE', credentials: 'include' })
    return res.ok
  } catch { return false }
}