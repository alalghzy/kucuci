import { createSheetDBClient } from './sheetdb.client'
import type { IOrderRepository, IServiceRepository, IUserRepository } from './repository'
import type { Service } from '../../types/service'
import type { Order, OrderHistory, OrderStatus } from '../../types/order'
import type { User } from '../../types/user'

export class SheetDBUserRepository implements IUserRepository {
  private client: ReturnType<typeof createSheetDBClient>
  constructor(baseUrl: string) {
    this.client = createSheetDBClient(baseUrl)
  }
  async findByEmail(email: string): Promise<User | null> {
    const rows = await this.client.get<User>('users', `/search?email=${encodeURIComponent(email)}`)
    return rows[0] ?? null
  }
  async findById(id: string): Promise<User | null> {
    const rows = await this.client.get<User>('users', `/search?id=${encodeURIComponent(id)}`)
    return rows[0] ?? null
  }
  async create(user: User): Promise<User> {
    await this.client.post('users', user as unknown as Record<string, unknown>)
    return user
  }
  async upsert(user: User): Promise<User> {
    const existing = await this.findByEmail(user.email)
    if (existing) return existing
    return this.create(user)
  }
}

export class SheetDBServiceRepository implements IServiceRepository {
  private client: ReturnType<typeof createSheetDBClient>
  constructor(baseUrl: string) { this.client = createSheetDBClient(baseUrl) }
  async findAll(): Promise<Service[]> {
    return this.client.get<Service>('services')
  }
  async findById(id: string): Promise<Service | null> {
    const rows = await this.client.get<Service>('services', `/search?id=${encodeURIComponent(id)}`)
    return rows[0] ?? null
  }
  async create(data: Omit<Service, 'created_at'>): Promise<Service> {
    const row = { ...data, created_at: new Date().toISOString() }
    await this.client.post('services', row as unknown as Record<string, unknown>)
    return row as Service
  }
  async update(id: string, data: Partial<Service>): Promise<Service> {
    await this.client.patch('services', 'id', id, data as Record<string, unknown>)
    const updated = await this.findById(id)
    if (!updated) throw new Error('Service not found after update')
    return updated
  }
}

export class SheetDBOrderRepository implements IOrderRepository {
  private client: ReturnType<typeof createSheetDBClient>
  constructor(baseUrl: string) { this.client = createSheetDBClient(baseUrl) }

  async findByUser(userId: string): Promise<Order[]> {
    return this.client.get<Order>('orders', `/search?user_id=${encodeURIComponent(userId)}`)
  }
  async findAll(): Promise<Order[]> {
    return this.client.get<Order>('orders')
  }
  async findById(id: string): Promise<Order | null> {
    const rows = await this.client.get<Order>('orders', `/search?id=${encodeURIComponent(id)}`)
    return rows[0] ?? null
  }
  async create(data: { userId: string; userEmail: string; serviceId: string } & Record<string, unknown>): Promise<Order> {
    const id = `INV-${new Date().toISOString().slice(2,10).replace(/-/g,'')}-${String(Date.now()).slice(-3)}`
    const now = new Date().toISOString()
    const order: Order = {
      id,
      user_id: data.userId,
      user_email: data.userEmail,
      service_id: data.serviceId as string,
      service_name: (data.service_name as string) ?? '',
      unit: (data.unit as Order['unit']) ?? 'Kg',
      total_price: (data.total_price as number) ?? 0,
      status: 'diterima',
      created_at: now,
      updated_at: now,
      weight: data.weight as number | undefined,
      qty: data.qty as number | undefined,
      pickup_date: data.pickup_date as string | undefined,
      finish_date: data.finish_date as string | undefined,
      notes: data.notes as string | undefined,
    }
    await this.client.post('orders', order as unknown as Record<string, unknown>)
    await this.client.post('order_history', { id: `hist-${Date.now()}`, order_id: id, status: 'diterima', timestamp: now, note: 'Pesanan Diterima' } as Record<string, unknown>)
    return order
  }
  async updateStatus(id: string, status: OrderStatus, note?: string, changedBy?: string): Promise<Order> {
    const now = new Date().toISOString()
    await this.client.patch('orders', 'id', id, { status, updated_at: now } as Record<string, unknown>)
    await this.client.post('order_history', { id: `hist-${Date.now()}`, order_id: id, status, timestamp: now, note: note ?? '', changed_by: changedBy ?? 'admin' } as Record<string, unknown>)
    const updated = await this.findById(id)
    if (!updated) throw new Error('Order not found')
    return updated
  }
  async getHistory(orderId: string): Promise<OrderHistory[]> {
    return this.client.get<OrderHistory>('order_history', `/search?order_id=${encodeURIComponent(orderId)}`)
  }
}
