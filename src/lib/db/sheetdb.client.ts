// SheetDB client with 60s memory cache — migration-ready
let cache = new Map<string, { data: unknown; expiry: number }>()

export function createSheetDBClient(baseUrl: string) {
  const get = async <T>(sheet: string, query?: string): Promise<T[]> => {
    const key = `${sheet}:${query ?? ''}`
    const hit = cache.get(key)
    if (hit && hit.expiry > Date.now()) return hit.data as T[]

    // SheetDB format: ?sheet=Name&search
    let url = `${baseUrl}?sheet=${encodeURIComponent(sheet)}`
    if (query) {
      // query like /search?email=xxx -> convert to &search
      if (query.startsWith('/search?')) url += `&${query.slice(8)}`
      else url += query
    }
    try {
      const res = await fetch(url)
      if (!res.ok) {
        // 404 sheet not found -> return empty for graceful fallback
        if (res.status === 404) return []
        throw new Error(`SheetDB GET ${sheet} failed: ${res.status}`)
      }
      const data = (await res.json()) as T[]
      cache.set(key, { data, expiry: Date.now() + 60_000 })
      return Array.isArray(data) ? data : []
    } catch (e) {
      console.warn(`SheetDB get ${sheet} failed, fallback empty`, e)
      return []
    }
  }

  const post = async <T>(sheet: string, body: Record<string, unknown>): Promise<T> => {
    cache.clear()
    const url = `${baseUrl}?sheet=${encodeURIComponent(sheet)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: body }),
    })
    if (!res.ok) throw new Error(`SheetDB POST ${sheet} failed ${res.status}: ${await res.text()}`)
    return (await res.json()) as T
  }

  const patch = async <T>(sheet: string, column: string, value: string, body: Record<string, unknown>): Promise<T> => {
    cache.clear()
    const url = `${baseUrl}/${encodeURIComponent(column)}/${encodeURIComponent(value)}?sheet=${encodeURIComponent(sheet)}`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: body }),
    })
    if (!res.ok) throw new Error(`SheetDB PATCH ${sheet} failed`)
    return (await res.json()) as T
  }

  return { get, post, patch, clearCache: () => cache.clear() }
}
