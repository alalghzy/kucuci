export interface Notification {
  id: string
  title: string
  message: string
  created_at: string
  is_active: boolean
  user_email?: string
  read_at?: string
  type?: string
  order_id?: string
}