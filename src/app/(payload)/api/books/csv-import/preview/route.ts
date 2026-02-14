/**
 * CSV Preview Endpoint
 * POST /api/books/csv-import/preview
 *
 * Validates CSV file without saving to database
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { previewCSVImport, quickValidateFormat } from '@/lib/csv/importer'
import type { CSVImportOptions } from '@/lib/csv/types'
import { DuplicateStrategy } from '@/lib/csv/types'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  // Rate limiting: 10 requests per minute
  const rateLimit = checkRateLimit(request, {
    maxRequests: 10,
    windowSeconds: 60,
  })

  const rateLimitHeaders = getRateLimitHeaders(10, rateLimit.remaining, rateLimit.resetAt)

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

    // Authentication check - only authenticated users can preview imports
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const optionsJson = formData.get('options') as string | null
    const quickMode = formData.get('quickMode') === 'true'

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 },
      )
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid file type. Please upload a CSV file.',
        },
        { status: 400 },
      )
    }

    // Validate file size (5MB limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      )
    }

    // Read file content with explicit UTF-8 encoding
    // The File.text() method reads as UTF-8 by default, but we ensure proper handling
    const arrayBuffer = await file.arrayBuffer()
    const decoder = new TextDecoder('utf-8')
    const csvContent = decoder.decode(arrayBuffer)

    // Parse options
    let options: CSVImportOptions = {
      duplicateStrategy: DuplicateStrategy.WARN,
      autoCreateCategories: true,
      autoCreateSubjects: true,
      autoPopulateFromISBN: false,
      downloadCoverImages: true,
      defaultCurrency: 'USD',
      batchSize: 10,
    }

    if (optionsJson) {
      try {
        const parsedOptions = JSON.parse(optionsJson)
        options = { ...options, ...parsedOptions }
      } catch (_error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid options JSON',
          },
          { status: 400 },
        )
      }
    }

    // Quick mode: fast format validation only (first 5 rows)
    if (quickMode) {
      const quickResult = quickValidateFormat(csvContent, 5)
      return NextResponse.json(
        {
          success: true,
          quickPreview: quickResult,
        },
        {
          headers: rateLimitHeaders,
        },
      )
    }

    // Full preview: validate all rows and detect duplicates
    const result = await previewCSVImport(csvContent, options, payload)

    return NextResponse.json(
      {
        success: true,
        preview: result,
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
        msg: 'CSV preview failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch {
      // Fallback if payload fails
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to preview CSV',
      },
      { status: 500 },
    )
  }
}
