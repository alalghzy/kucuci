import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface QrisConfig {
  merchant: string
  accountName: string
  accountNumber: string
  qrPayload: string
  enabled: boolean
}

interface ConfigState {
  qris: QrisConfig
  setQris: (c: Partial<QrisConfig>) => void
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      qris: {
        merchant: 'KuCuci',
        accountName: 'KuCuci Official',
        accountNumber: 'QRIS-KC-0001',
        qrPayload: '00020101021226650014ID.COM.QRIS-WWW01179370152915QRIS-KC-00010303UMI51460016ID895067MD1234567YY5204419853033605802ID5911KUCUCI6007BANDUNG6105102556304',
        enabled: true,
      },
      setQris: (c) => set((s) => ({ qris: { ...s.qris, ...c } })),
    }),
    { name: 'config-storage' }
  )
)