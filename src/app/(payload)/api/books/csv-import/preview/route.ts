/**
 * CSV Preview Endpoint
 * POST /api/books/csv-import/preview
 *
 * Validates CSV file without saving to database
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { previewCSVImport } from '@/lib/csv/importer'
import type { CSVImportOptions } from '@/lib/csv/types'
import { DuplicateStrategy } from '@/lib/csv/types'

export async function POST(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const optionsJson = formData.get('options') as string | null

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

    // Read file content
    const csvContent = await file.text()

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
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid options JSON',
          },
          { status: 400 },
        )
      }
    }

    // Preview import
    const result = await previewCSVImport(csvContent, options, payload)

    return NextResponse.json({
      success: true,
      preview: result,
    })
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
