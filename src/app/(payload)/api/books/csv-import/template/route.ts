/**
 * CSV Template Download Endpoint
 * GET /api/books/csv-import/template
 *
 * Returns a CSV template with sample data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { generateTemplate } from '@/lib/csv/parser'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit'
import { requireRole } from '@/lib/access'

export async function GET(request: NextRequest) {
  // Authorization check - only admin/volunteer can download templates
  try {
    const payload = await getPayload({ config })
    const auth = await requireRole(payload, request.headers, ['admin', 'volunteer'])
    if (!auth.authorized) return auth.response
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
  // Rate limiting: 20 requests per minute for template downloads
  const rateLimit = checkRateLimit(request, {
    maxRequests: 20,
    windowSeconds: 60,
  })

  const rateLimitHeaders = getRateLimitHeaders(20, rateLimit.remaining, rateLimit.resetAt)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      },
      {
        status: 429,
        headers: rateLimitHeaders,
      },
    )
  }

  try {
    const template = generateTemplate()

    return new NextResponse(template, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="books-import-template.csv"',
        ...rateLimitHeaders,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate template',
      },
      { status: 500 },
    )
  }
}
