import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types/user'
import { forceReloadOrders } from './useOrderStore'
import { forceReloadNotifications } from './useNotificationStore'

interface AuthState {
  user: User | null
  login: (user: User) => void
  logout: () => void
  isAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      login: (user) => {
        set({ user })
        // User berubah -> muat ulang data milik user yang baru
        setTimeout(() => { forceReloadOrders(); forceReloadNotifications() }, 0)
      },
      logout: () => {
        set({ user: null })
        // bersihkan cookie sesi backend
        try { fetch('/api/auth/logout', { method: 'POST' }) } catch { /* noop */ }
      },
      isAdmin: () => get().user?.role === 'admin',
    }),
    { name: 'auth-storage' }
  )
)

// Cek sesi aktif via backend (panggil sekali saat app boot)
export async function hydrateAuth(getUser: (u: any) => void): Promise<void> {
  // Hanya pakai hasil /api/auth/me jika session server valid; jangan timpa login lokal
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (res.ok) {
      const { user } = await res.json()
      if (user) getUser(user)
    }
  } catch { /* offline: pakai store lokal */ }
}
