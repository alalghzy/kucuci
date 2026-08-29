export interface Service {
  id: string
  name: string
  slug: string
  description?: string
  price: number
  unit: 'Kg' | 'Pc' | 'Pasang'
  icon_name: string
  is_active: boolean
  created_at: string
}
