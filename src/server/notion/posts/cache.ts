const cache = new Map<string, Promise<unknown>>()

export function memoizeOnce<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    cache.set(key, loader())
  }
  return cache.get(key) as Promise<T>
}

export function clearNotionPostCache(): void {
  cache.clear()
}
