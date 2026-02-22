const store = new Map<string, { count: number; reset: number }>()

/**
 * In-memory rate limiter. Per-instance in serverless — best-effort protection.
 * Returns false when the limit is exceeded for the given key.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count++
  return true
}
