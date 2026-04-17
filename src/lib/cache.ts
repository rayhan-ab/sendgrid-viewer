import fs from 'node:fs/promises'
import path from 'node:path'
import { getStore } from '@netlify/blobs'

const CACHE_DIR = path.join(process.cwd(), '.cache')
const STORE_NAME = 'template-cache'

// Netlify sets some environment variables that we can use to detect the environment
const isNetlify = process.env.NETLIFY === 'true' || !!process.env.NETLIFY_PURGE_API_TOKEN

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
  if (isNetlify) {
    try {
      const store = getStore(STORE_NAME)
      const entry = await store.get(key, { type: 'json' }) as CacheEntry<T> | null
      if (!entry) return null

      const now = Date.now()
      if (now - entry.timestamp > entry.ttl) {
        await store.delete(key).catch(() => {})
        return null
      }

      return entry.value
    } catch (err) {
      console.error(`Netlify Blobs read error for ${key}:`, err)
      return null
    }
  }

  // Local filesystem fallback
  const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`)
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    const entry: CacheEntry<T> = JSON.parse(data)

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      await fs.unlink(filePath).catch(() => {})
      return null
    }

    return entry.value
  } catch (err) {
    return null
  }
}

export async function set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
  const entry: CacheEntry<T> = {
    value,
    timestamp: Date.now(),
    ttl
  }

  if (isNetlify) {
    try {
      const store = getStore(STORE_NAME)
      await store.setJSON(key, entry)
      return
    } catch (err) {
      console.error(`Netlify Blobs write error for ${key}:`, err)
    }
  }

  // Local filesystem fallback
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`)
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8')
  } catch (err) {
    console.error(`Failed to write cache for ${key}:`, err)
  }
}

export async function del(key: string): Promise<void> {
  if (isNetlify) {
    try {
      const store = getStore(STORE_NAME)
      await store.delete(key)
      return
    } catch (err) {
      console.error(`Netlify Blobs delete error for ${key}:`, err)
    }
  }

  const filePath = path.join(CACHE_DIR, `${encodeURIComponent(key)}.json`)
  try {
    await fs.unlink(filePath)
  } catch (err) {
    // Ignore error if file doesn't exist
  }
}

