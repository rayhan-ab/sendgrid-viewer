import fs from 'node:fs/promises'
import path from 'node:path'

const CACHE_DIR = path.join(process.cwd(), '.cache')

interface CacheEntry<T> {
  value: T
  timestamp: number
  ttl: number
}

/**
 * Default TTL is 7 days in milliseconds
 */
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000

export async function get<T>(key: string): Promise<T | null> {
  const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`)
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    const entry: CacheEntry<T> = JSON.parse(data)

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      await fs.unlink(filePath).catch(() => {}) // Clean up expired cache
      return null
    }

    return entry.value
  } catch (err) {
    return null
  }
}

export async function set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`)
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl
    }
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8')
  } catch (err) {
    console.error(`Failed to write cache for ${key}:`, err)
  }
}

export async function del(key: string): Promise<void> {
  const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`)
  try {
    await fs.unlink(filePath)
  } catch (err) {
    // Ignore error if file doesn't exist
  }
}
