const cache = new Map<string, Promise<unknown>>()

export function memoizeOnce<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) {
    const promise = Promise.resolve()
      .then(loader)
      .catch((error) => {
        cache.delete(key)
        throw error
      })

    cache.set(key, promise)
  }
  return cache.get(key) as Promise<T>
}

export function clearNotionPostCache(): void {
  cache.clear()
}
