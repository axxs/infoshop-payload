/**
 * Shared LRU Cache Implementation for Book Lookup
 *
 * Generic in-memory cache with TTL and LRU eviction policy.
 * Used by all book lookup sources (Google Books, OpenLibrary, WorldCat)
 * to reduce API calls and improve performance.
 *
 * Features:
 * - Time-to-live (TTL) expiration
 * - Least Recently Used (LRU) eviction when at capacity
 * - Type-safe generic implementation
 *
 * @module bookLookup/cache
 */

import { CACHE } from './config'

export interface CacheOptions {
  /** Maximum number of entries before LRU eviction */
  maxSize?: number
  /** Time-to-live in milliseconds */
  ttl?: number
}

/**
 * Generic LRU Cache with TTL expiration
 *
 * Note: This implementation is single-threaded safe (Node.js event loop).
 * For multi-threaded environments, use external cache like Redis.
 *
 * @template T - The type of data being cached
 */
export class LRUCache<T> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map()
  private readonly ttl: number
  private readonly maxSize: number

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? CACHE.MAX_SIZE
    this.ttl = options.ttl ?? CACHE.TTL
  }

  /**
   * Store a value in the cache
   *
   * @param key - Cache key (usually ISBN)
   * @param data - Data to cache
   */
  set(key: string, data: T): void {
    // If at max size, remove oldest entry (LRU)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * Retrieve a value from the cache
   *
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  get(key: string): T | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }

    // Move to end (mark as recently used)
    // This is safe in single-threaded Node.js
    this.cache.delete(key)
    this.cache.set(key, cached)

    return cached.data
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Remove a specific entry from cache
   *
   * @param key - Cache key to remove
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }
}
