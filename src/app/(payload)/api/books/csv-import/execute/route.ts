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

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

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

    // Check if preview has errors
    if (preview.hasErrors) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot execute import with validation errors. Please fix errors and try again.',
        },
        { status: 400 },
      )
    }

    // Execute import
    const result = await executeCSVImport(preview, options || {}, payload)

    return NextResponse.json({
      success: true,
      result,
    })
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
