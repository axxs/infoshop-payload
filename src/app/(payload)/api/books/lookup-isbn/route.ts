/**
 * ISBN Lookup API Route
 *
 * Provides book lookup functionality via Open Library API
 * Endpoint: GET /api/books/lookup-isbn?isbn={isbn}
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateISBN } from '@/lib/isbnUtils'
import { lookupBookByISBN } from '@/lib/openLibrary'

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract ISBN from query parameter
    const searchParams = request.nextUrl.searchParams
    const isbn = searchParams.get('isbn')

    if (!isbn) {
      return NextResponse.json(
        {
          success: false,
          error: 'ISBN parameter is required',
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
    // Error details are included in the response for debugging
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error while looking up ISBN',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
