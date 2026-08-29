import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WizardState {
  serviceId: string | null
  weight: number
  qty: number
  notes: string
  customer_name: string
  pickup_date: string
  pickup_time: string
  pickup_method: 'antar' | 'jemput'
  payment_method: 'qris' | 'cod'
  address: string
  step: number
  set: (p: Partial<WizardState>) => void
  reset: () => void
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      serviceId: null,
      weight: 1,
      qty: 1,
      notes: '',
      customer_name: '',
      pickup_date: new Date(Date.now() + 2*86400000).toISOString().slice(0,10),
      pickup_time: '10:00',
      pickup_method: 'jemput',
      payment_method: 'qris',
      address: '',
      step: 1,
      set: (p) => set(p),
      reset: () => set({ serviceId: null, weight: 1, qty: 1, notes: '', customer_name: '', pickup_time: '10:00', step: 1 }),
    }),
    { name: 'wizard-storage' }
  )
)
