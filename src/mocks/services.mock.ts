import type { Service } from '../types/service'

export const mockServices: Service[] = [
  { id: 'srv-01', name: 'Cuci & Setrika', slug: 'cuci-setrika', price: 12000, unit: 'Kg', icon_name: 'washer', is_active: true, created_at: new Date().toISOString() },
  { id: 'srv-02', name: 'Cuci Kering', slug: 'cuci-kering', price: 18000, unit: 'Kg', icon_name: 'shirt', is_active: true, created_at: new Date().toISOString() },
  { id: 'srv-03', name: 'Setrika Saja', slug: 'setrika-saja', price: 6000, unit: 'Kg', icon_name: 'iron', is_active: true, created_at: new Date().toISOString() },
  { id: 'srv-04', name: 'Bed Cover', slug: 'bed-cover', price: 25000, unit: 'Pc', icon_name: 'bed', is_active: true, created_at: new Date().toISOString() },
  { id: 'srv-05', name: 'Sepatu', slug: 'sepatu', price: 20000, unit: 'Pasang', icon_name: 'shoe', is_active: true, created_at: new Date().toISOString() },
]
