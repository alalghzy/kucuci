import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Notification } from '../types/notification'

interface NotificationState {
  notifications: Notification[]
  loading: boolean
  load: () => Promise<void>
  addNotification: (data: Omit<Notification, 'id' | 'created_at'>) => void
  updateNotification: (id: string, patch: Partial<Notification>) => void
  removeNotification: (id: string) => void
  toggleActive: (id: string) => void
  markAllRead: () => Promise<void>
  setLoaded: (v: boolean) => void
}

let loaded = false

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [],
      loading: false,
      load: async () => {
        if (loaded) return
        loaded = true
        set({ loading: true })
        try {
          const res = await fetch('/api/notifications')
          if (res.ok) {
            const parsed = (await res.json()) as Notification[]
            if (Array.isArray(parsed)) {
              set({ notifications: parsed, loading: false })
              return
            }
          }
        } catch { /* fallback */ }
        set({ loading: false })
      },

      addNotification: (data) => {
        const n: Notification = {
          ...data,
          id: `notif-${Date.now()}`,
          created_at: new Date().toISOString(),
        }
        set((s) => ({ notifications: [n, ...s.notifications] }))
      },

      updateNotification: (id, patch) =>
        set((s) => ({
          notifications: s.notifications.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),

      removeNotification: (id) =>
        set((s) => ({ notifications: s.notifications.filter((x) => x.id !== id) })),

      toggleActive: (id) =>
        set((s) => ({
          notifications: s.notifications.map((x) => (x.id === id ? { ...x, is_active: !x.is_active } : x)),
        })),

      markAllRead: async () => {
        // Update lokal: tandai semua notif yang tidak punya user_email (umum) & belum dibaca jadi dibaca
        try {
          await fetch('/api/notifications/read-all', { method: 'POST' })
        } catch { /* ignore */ }
        const now = new Date().toISOString()
        set((s) => ({
          notifications: s.notifications.map((x) => (x.read_at === undefined || x.read_at === '' ? { ...x, read_at: now } : x)),
        }))
      },
      setLoaded: (v) => { loaded = v },
    }),
    { name: 'notification-storage' }
  )
)

// Paksa reload notifikasi (dipakai setelah login/logout)
export function forceReloadNotifications() {
  useNotificationStore.getState().setLoaded(false)
  return useNotificationStore.getState().load()
}

// --- sinkronisasi ke backend ---

export async function syncAddNotification(data: Omit<Notification, 'id' | 'created_at'>): Promise<string | null> {
  try {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    })
    if (res.ok) {
      const n = await res.json()
      return n.id ?? null
    }
    return null
  } catch { return null }
}

export async function syncUpdateNotification(id: string, patch: Partial<Notification>): Promise<boolean> {
  try {
    const res = await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
      credentials: 'include',
    })
    return res.ok
  } catch { return false }
}