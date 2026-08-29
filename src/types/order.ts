export type OrderStatus = 'menunggu_pembayaran' | 'diterima' | 'dicuci' | 'pengeringan' | 'setrika' | 'siap' | 'selesai' | 'dibatalkan'

export type PaymentMethod = 'qris' | 'cod'

export interface Order {
  id: string
  user_id: string
  user_email: string
  service_id: string
  service_name: string
  weight?: number
  qty?: number
  unit: 'Kg' | 'Pc' | 'Pasang'
  total_price: number
  status: OrderStatus
  payment_method?: PaymentMethod
  payment_status?: string
  payment_ref?: string
  qr_url?: string
  pickup_method?: 'antar' | 'jemput'
  pickup_date?: string
  finish_date?: string
  notes?: string
  customer_name?: string
  pickup_time?: string
  address?: string
  created_at: string
  updated_at: string
}

export interface OrderHistory {
  id: string
  order_id: string
  status: OrderStatus
  timestamp: string
  note?: string
  changed_by?: string
}

export interface CreateOrderDto {
  serviceId: string
  weight?: number
  qty?: number
  pickup_date?: string
  finish_date?: string
  pickup_method?: 'antar' | 'jemput'
  notes?: string
}
