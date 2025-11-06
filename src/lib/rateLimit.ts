/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter to prevent abuse
 *
 * ⚠️ WARNING: This is a simple in-memory implementation suitable for development/testing.
 * For production, consider using:
 * - Redis-backed rate limiter (e.g., ioredis + rate-limiter-flexible)
 * - Database-backed rate limiter
 * - Edge/CDN rate limiting (Cloudflare, Vercel Edge Config)
 *
 * Limitations:
 * - Not suitable for serverless environments with multiple instances
 * - Memory accumulation risk in long-running processes
 * - No distributed coordination
 *
 * @module lib/rateLimit
 */

import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
  lastAccessed: number // For LRU eviction
}

// Maximum number of entries to prevent memory leaks
const MAX_ENTRIES = 10000

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(
  () => {
    const now = Date.now()
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key)
      }
    }
  },
  5 * 60 * 1000,
)

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number

  /**
   * Time window in seconds
   */
  windowSeconds: number
}

/**
 * Default rate limit: 10 requests per minute
 */
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowSeconds: 60,
}

/**
 * Extracts client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  // Check common proxy headers
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback to remote address (may not be available in serverless)
  return 'unknown'
}

/**
 * Checks if a request should be rate limited
 *
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns Object with allowed status and remaining requests
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const clientIP = getClientIP(request)
  const now = Date.now()
  const resetAt = now + config.windowSeconds * 1000

  // Get or create rate limit entry
  let entry = rateLimitStore.get(clientIP)

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    entry = {
      count: 0,
      resetAt,
      lastAccessed: now,
    }
    rateLimitStore.set(clientIP, entry)
  }

  // Update last accessed time for LRU eviction
  entry.lastAccessed = now

  // Increment request count atomically BEFORE checking (fixes race condition)
  entry.count++
  rateLimitStore.set(clientIP, entry) // Ensure persistence

  const allowed = entry.count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - entry.count)

  // Enforce max entries using LRU eviction
  if (rateLimitStore.size > MAX_ENTRIES) {
    // Find and remove the least recently accessed entry
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, value] of rateLimitStore.entries()) {
      if (value.lastAccessed < oldestTime) {
        oldestTime = value.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      rateLimitStore.delete(oldestKey)
    }
  }

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
  }
}

/**
 * Creates rate limit headers for response
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  resetAt: number,
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.floor(resetAt / 1000).toString(),
  }
}
