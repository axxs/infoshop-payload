/**
 * CSV Execute Endpoint
 * POST /api/books/csv-import/execute
 *
 * Executes a validated CSV import (writes to database)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { executeCSVImport } from '@/lib/csv/importer'
import type { PreviewResult, CSVImportOptions } from '@/lib/csv/types'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit'
import { requireRole } from '@/lib/access'

export async function POST(request: NextRequest) {
  // Rate limiting: 5 requests per minute (stricter for database writes)
  const rateLimit = checkRateLimit(request, {
    maxRequests: 5,
    windowSeconds: 60,
  })

  const rateLimitHeaders = getRateLimitHeaders(5, rateLimit.remaining, rateLimit.resetAt)

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
    const payload = await getPayload({ config })

    // Authorization check - only admin/volunteer can execute imports
    const auth = await requireRole(payload, request.headers, ['admin', 'volunteer'])
    if (!auth.authorized) return auth.response

    // Parse request body
    const body = await request.json()
    const { preview, options } = body as {
      preview: PreviewResult
      options: CSVImportOptions
    }

    if (!preview) {
      return NextResponse.json(
        {
          success: false,
          error: 'No preview data provided',
        },
        { status: 400 },
      )
    }

    // Check if preview has errors (unless continueWithErrors is enabled)
    if (preview.hasErrors && !options?.continueWithErrors) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Cannot execute import with validation errors. Fix errors or enable "Continue with errors" to skip invalid rows.',
        },
        { status: 400 },
      )
    }

    // Execute import
    const result = await executeCSVImport(preview, options || {}, payload)

    return NextResponse.json(
      {
        success: true,
        result,
      },
      {
        headers: rateLimitHeaders,
      },
    )
  } catch (error) {
    // Log error
    try {
      const payload = await getPayload({ config })
      payload.logger.error({
        msg: 'CSV execution failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch {
      // Fallback if payload fails
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute CSV import',
      },
      { status: 500 },
    )
  }
}
