/**
 * CSV Error Report Endpoint
 * POST /api/books/csv-import/error-report
 *
 * Generates a downloadable CSV report of failed import rows
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import Papa from 'papaparse'
import type { PreviewResult, ErrorReportRow, BookOperationResult } from '@/lib/csv/types'
import { ValidationSeverity } from '@/lib/csv/types'

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { preview } = body as { preview: PreviewResult }

    if (!preview) {
      return NextResponse.json(
        {
          success: false,
          error: 'No preview data provided',
        },
        { status: 400 },
      )
    }

    // Build error report rows from invalid operations
    const errorRows: ErrorReportRow[] = []

    for (const result of preview.results) {
      if (!result.isValid) {
        const errorIssues = result.issues.filter(
          (issue) => issue.severity === ValidationSeverity.ERROR,
        )

        for (const issue of errorIssues) {
          errorRows.push({
            row: result.operation.rowIndex,
            title: result.operation.title || '',
            isbn: result.operation.isbn || '',
            field: issue.field,
            error: issue.message,
            originalValue: getOriginalValue(result, issue.field),
          })
        }
      }
    }

    // Generate CSV
    const csvContent = Papa.unparse({
      fields: ['Row', 'Title', 'ISBN', 'Field', 'Error', 'OriginalValue'],
      data: errorRows.map((row) => [
        row.row.toString(),
        row.title,
        row.isbn,
        row.field,
        row.error,
        row.originalValue,
      ]),
    })

    // Return as downloadable CSV
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="import-errors-${Date.now()}.csv"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate error report',
      },
      { status: 500 },
    )
  }
}

/**
 * Extracts the original value for a field from the operation
 */
function getOriginalValue(result: BookOperationResult, field: string): string {
  const op = result.operation

  switch (field) {
    case 'title':
      return op.title || ''
    case 'author':
      return op.author || ''
    case 'isbn':
      return op.isbn || ''
    case 'pricing':
      return `costPrice=${op.costPrice ?? ''}, sellPrice=${op.sellPrice ?? ''}, memberPrice=${op.memberPrice ?? ''}`
    case 'costPrice':
      return op.costPrice?.toString() || ''
    case 'sellPrice':
      return op.sellPrice?.toString() || ''
    case 'memberPrice':
      return op.memberPrice?.toString() || ''
    case 'currency':
      return op.currency || ''
    case 'stockQuantity':
      return op.stockQuantity?.toString() || ''
    case 'reorderLevel':
      return op.reorderLevel?.toString() || ''
    case 'stockStatus':
      return op.stockStatus || ''
    case 'downloadUrl':
      return op.downloadUrl || ''
    default:
      return ''
  }
}
