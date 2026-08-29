import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Order, OrderStatus } from '../types/order'

interface OrderState {
  orders: Order[]
  setOrders: (o: Order[]) => void
  addOrder: (o: Order) => void
  updateOrder: (id: string, patch: Partial<Order>) => void
  load: () => Promise<void>
  loadAll: () => Promise<void>
  setLoaded: (v: boolean) => void
}

let loaded = false

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      orders: [],
      setOrders: (orders) => set({ orders }),
      addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),
      updateOrder: (id, patch) => set((s) => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...patch } : o) })),
      load: async () => {
        if (loaded) return
        loaded = true
        try {
          const res = await fetch('/api/orders?mine=1')
          if (res.ok) {
            const data = (await res.json()) as Order[]
            if (Array.isArray(data)) {
              set({ orders: data })
            }
          }
        } catch { /* keep muat lokal jika API belum aktif */ }
      },
      // Muat SEMUA order (khusus admin — tanpa ?mine=1)
      loadAll: async () => {
        try {
          const res = await fetch('/api/orders')
          if (res.ok) {
            const data = (await res.json()) as Order[]
            if (Array.isArray(data)) set({ orders: data })
          }
        } catch { /* ignore */ }
      },
      setLoaded: (v) => { loaded = v },
    }),
    { name: 'order-storage' }
  )
)

// Paksa reload data order (dipakai setelah login/logout / saat admin masuk)
export function forceReloadOrders() {
  useOrderStore.getState().setLoaded(false)
  return useOrderStore.getState().load()
}

// Helper: kirim order baru ke API backend (pakai dari BuatPesanan)
export async function pushOrder(o: Order): Promise<boolean> {
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(o),
    })
    return res.ok
  } catch {
    return false
  }
}

// Helper: update status order via API (pakai dari admin dashboard)
export async function pushOrderStatus(id: string, status: OrderStatus, note?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    })
    return res.ok
  } catch {
    return false
  }
}