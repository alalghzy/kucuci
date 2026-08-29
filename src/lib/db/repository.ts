import type { Service } from '../../types/service'
import type { Order, OrderHistory, CreateOrderDto, OrderStatus } from '../../types/order'
import type { User } from '../../types/user'

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  create(user: User): Promise<User>
  upsert(user: User): Promise<User>
}

export interface IServiceRepository {
  findAll(): Promise<Service[]>
  findById(id: string): Promise<Service | null>
  create(data: Omit<Service, 'created_at'>): Promise<Service>
  update(id: string, data: Partial<Service>): Promise<Service>
}

export interface IOrderRepository {
  findByUser(userId: string): Promise<Order[]>
  findAll(): Promise<Order[]>
  findById(id: string): Promise<Order | null>
  create(data: CreateOrderDto & { userId: string; userEmail: string }): Promise<Order>
  updateStatus(id: string, status: OrderStatus, note?: string, changedBy?: string): Promise<Order>
  getHistory(orderId: string): Promise<OrderHistory[]>
}

export interface IPromoRepository {
  findAll(): Promise<unknown[]>
}
