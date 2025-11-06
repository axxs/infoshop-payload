/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter to prevent abuse
 *
 * @module lib/rateLimit
 */

import { NextRequest } from 'next/server'

interface RateLimitEntry {
  count: number
  resetAt: number
}

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
    }
    rateLimitStore.set(clientIP, entry)
  }

  // Increment request count
  entry.count++

  const allowed = entry.count <= config.maxRequests
  const remaining = Math.max(0, config.maxRequests - entry.count)

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
