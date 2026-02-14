/**
 * ISBN Lookup API Route
 *
 * Provides book lookup functionality via Open Library API
 * Endpoint: GET /api/books/lookup-isbn?isbn={isbn}
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { validateISBN } from '@/lib/isbnUtils'
import { lookupBookByISBN } from '@/lib/bookLookup'
import { requireRole } from '@/lib/access'

/**
 * Simple in-memory rate limiter
 * Tracks requests per IP with sliding window (30 requests per minute)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly limit = 30
  private readonly windowMs = 60 * 1000 // 1 minute

  check(ip: string): boolean {
    const now = Date.now()
    const timestamps = this.requests.get(ip) || []

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter((time) => now - time < this.windowMs)

    if (validTimestamps.length >= this.limit) {
      return false
    }

    // Add current request
    validTimestamps.push(now)
    this.requests.set(ip, validTimestamps)

    // Cleanup old entries periodically
    if (this.requests.size > 1000) {
      this.cleanup()
    }

    return true
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [ip, timestamps] of this.requests.entries()) {
      const valid = timestamps.filter((time) => now - time < this.windowMs)
      if (valid.length === 0) {
        this.requests.delete(ip)
      } else {
        this.requests.set(ip, valid)
      }
    }
  }
}

const rateLimiter = new RateLimiter()

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Rate limiting: 30 requests per minute per IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'

  if (!rateLimiter.check(ip)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many requests. Please try again later.',
      },
      { status: 429 },
    )
  }
  try {
    // Authorization check - only admin/volunteer can look up ISBNs
    const payload = await getPayload({ config })
    const auth = await requireRole(payload, request.headers, ['admin', 'volunteer'])
    if (!auth.authorized) return auth.response

    // Extract and sanitize ISBN from query parameter
    const searchParams = request.nextUrl.searchParams
    const rawIsbn = searchParams.get('isbn')

    if (!rawIsbn) {
      return NextResponse.json(
        {
          success: false,
          error: 'ISBN parameter is required',
        },
        { status: 400 },
      )
    }

    // Sanitize input: trim whitespace and enforce reasonable length limit
    const isbn = rawIsbn.trim()
    if (isbn.length > 20) {
      return NextResponse.json(
        {
          success: false,
          error: 'ISBN parameter too long (max 20 characters)',
        },
        { status: 400 },
      )
    }

    // Validate ISBN format
    const validation = validateISBN(isbn)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid ISBN format',
          details: {
            provided: isbn,
            cleaned: validation.cleaned,
          },
        },
        { status: 400 },
      )
    }

    // Look up book from Open Library
    const result = await lookupBookByISBN(isbn)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Book not found',
          source: result.source,
        },
        { status: 404 },
      )
    }

    // Return book data
    return NextResponse.json(
      {
        success: true,
        data: result.data,
        source: result.source,
        isbn: {
          provided: isbn,
          validated: validation.cleaned,
          type: validation.type,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    // Only include error details in development mode for security
    const isDevelopment = process.env.NODE_ENV === 'development'

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while looking up ISBN',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 },
    )
  }
}
