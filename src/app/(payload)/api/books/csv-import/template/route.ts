/**
 * CSV Template Download Endpoint
 * GET /api/books/csv-import/template
 *
 * Returns a CSV template with sample data
 */

import { NextResponse } from 'next/server'
import { generateTemplate } from '@/lib/csv/parser'

export async function GET() {
  try {
    const template = generateTemplate()

    return new NextResponse(template, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="books-import-template.csv"',
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
