// Cloudflare Pages Functions environment bindings for KuCuci
export interface D1Database {
  prepare(sql: string): D1PreparedStatement
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  all<T = unknown>(): Promise<{ results: T[]; meta?: { changes?: number; last_row_id?: number } }>
  run<T = unknown>(): Promise<{ results: T[]; success: boolean; meta?: { changes?: number; last_row_id?: number } }>
}

export interface EnvBindings {
  SHEETDB_BASE_URL: string
  JWT_SECRET: string
  ADMIN_EMAIL: string
  ADMIN_PASSWORD_HASH: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  OAUTH_REDIRECT?: string
  NODE_ENV?: string
  // Midtrans (payment gateway) — sandbox/prod server key
  MIDTRANS_SERVER_KEY?: string
  MIDTRANS_CLIENT_KEY?: string
  MIDTRANS_IS_PRODUCTION?: string
  // Cloudflare D1 binding (lihat wrangler.toml [[d1_databases]])
  kucuci_db: D1Database
}

// Global Env type reference used by Hono generics
declare global {
  type Env = EnvBindings
}

export {}