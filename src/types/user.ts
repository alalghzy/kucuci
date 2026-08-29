export type UserRole = 'customer' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  role: UserRole
  created_at: string
}
