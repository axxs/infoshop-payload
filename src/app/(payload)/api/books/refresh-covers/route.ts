/**
 * Refresh Cover Images API
 * Re-downloads cover images for books using ISBN lookup
 *
 * POST /api/books/refresh-covers
 * Query params:
 *   - limit: Max books to process (default: 50)
 *   - onlyMissing: Only process books without covers (default: false)
 */

import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { lookupBookByISBN } from '@/lib/bookLookup'
import { downloadCoverImageIfPresent } from '@/lib/openLibrary/imageDownloader'
import { validateImageURL } from '@/lib/urlValidator'
import { requireRole } from '@/lib/access'

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config })

  // Authorization check - only admin/volunteer can refresh covers
  const auth = await requireRole(payload, request.headers, ['admin', 'volunteer'])
  if (!auth.authorized) return auth.response

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const onlyMissing = searchParams.get('onlyMissing') === 'true'

  try {
    // Build query - get books with ISBNs
    const where: Where = onlyMissing
      ? {
          and: [{ isbn: { exists: true } }, { coverImage: { exists: false } }],
        }
      : { isbn: { exists: true } }

    const books = await payload.find({
      collection: 'books',
      where,
      limit,
      depth: 0,
    })

    const results = {
      total: books.docs.length,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const book of books.docs) {
      if (!book.isbn) {
        results.skipped++
        continue
      }

      try {
        // Look up book to get cover URL
        const lookupResult = await lookupBookByISBN(book.isbn)

        if (!lookupResult.success || !lookupResult.data?.coverImageUrl) {
          results.skipped++
          continue
        }

        // Validate URL
        const validatedUrl = validateImageURL(lookupResult.data.coverImageUrl)
        if (!validatedUrl) {
          results.skipped++
          continue
        }

        // Download new cover image
        const mediaId = await downloadCoverImageIfPresent(payload, validatedUrl, {
          bookTitle: book.title,
          alt: `Cover of ${book.title}`,
        })

        if (mediaId) {
          // Update book with new cover
          await payload.update({
            collection: 'books',
            id: book.id,
            data: {
              coverImage: mediaId,
            },
          })
          results.updated++

          payload.logger.info({
            msg: 'Cover image refreshed',
            bookId: book.id,
            title: book.title,
            mediaId,
          })
        } else {
          results.skipped++
        }
      } catch (error) {
        results.failed++
        results.errors.push(
          `${book.title}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error) {
    payload.logger.error({
      msg: 'Failed to refresh cover images',
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to refresh covers' },
      { status: 500 },
    )
  }
}
