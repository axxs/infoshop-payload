/**
 * Square Catalog Sync API Endpoint
 * POST /api/square/sync
 *
 * Synchronizes books with Square catalog
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  pushBooksToSquare,
  syncUnsyncedBooks,
  syncModifiedBooks,
} from '@/lib/square/catalogSync'

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { strategy, bookIds, since } = body

    // Validate strategy
    const validStrategies = ['specific', 'unsynced', 'modified']
    if (!validStrategies.includes(strategy)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid strategy. Must be one of: ${validStrategies.join(', ')}`,
        },
        { status: 400 },
      )
    }

    let result

    switch (strategy) {
      case 'specific':
        if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'bookIds array is required for specific strategy',
            },
            { status: 400 },
          )
        }
        result = await pushBooksToSquare(bookIds)
        break

      case 'unsynced':
        result = await syncUnsyncedBooks()
        break

      case 'modified':
        const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000)
        result = await syncModifiedBooks(sinceDate)
        break

      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid strategy',
          },
          { status: 400 },
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('Square sync error:', error)

    const isDevelopment = process.env.NODE_ENV === 'development'

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync with Square',
        ...(isDevelopment && {
          details: error instanceof Error ? error.message : 'Unknown error',
        }),
      },
      { status: 500 },
    )
  }
}
