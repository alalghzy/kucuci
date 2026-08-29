import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useAuthStore, hydrateAuth } from './stores/useAuthStore'
import { useOrderStore } from './stores/useOrderStore'

// Boot: pull sesi dari backend & pastikan state auth sudah ter-resolve
// SEBELUM render pertama — menghindari tampil "Tamu" sekilas setelah OAuth
// redirect balik (race condition).
async function boot() {
  // 1. Muat user dari cookie backend (jika ada)
  await hydrateAuth((u) => useAuthStore.setState({ user: u }))

  // 2. Ambil pesanan (backend sync)
  useOrderStore.getState().load().catch(() => {})

  // 3. Baru render
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

boot()