/**
 * Refresh Cover Images API
 * Re-downloads cover images for books using the multi-source cover waterfall.
 *
 * POST /api/books/refresh-covers
 * Query params:
 *   - limit:       Max books to process (default: 50, max: 200)
 *   - onlyMissing: Only process books without covers (default: false)
 */

import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import { NextRequest, NextResponse } from 'next/server'
import { downloadBestCoverImage } from '@/lib/openLibrary/imageDownloader'
import { validateImageURL } from '@/lib/urlValidator'
import { requireRole } from '@/lib/access'

const MAX_LIMIT = 200
const THROTTLE_MS = 200

export async function POST(request: NextRequest) {
  const payload = await getPayload({ config })

  // Authorization check - only admin/volunteer can refresh covers
  const auth = await requireRole(payload, request.headers, ['admin', 'volunteer'])
  if (!auth.authorized) return auth.response

  const { searchParams } = new URL(request.url)
  const raw = parseInt(searchParams.get('limit') || '50', 10)
  const limit = Math.min(Math.max(Number.isNaN(raw) ? 50 : raw, 1), MAX_LIMIT)
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
      select: {
        title: true,
        isbn: true,
        externalCoverUrl: true,
      },
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
        // Use stored externalCoverUrl as first candidate (avoids extra API call)
        const existingCoverUrl = book.externalCoverUrl
          ? (validateImageURL(book.externalCoverUrl) ?? undefined)
          : undefined

        // Run the multi-source cover waterfall
        const mediaId = await downloadBestCoverImage(payload, {
          isbn: book.isbn,
          existingCoverUrl,
          bookTitle: book.title,
          alt: `Cover of ${book.title}`,
          bookId: book.id,
        })

        if (mediaId) {
          await payload.update({
            collection: 'books',
            id: book.id,
            data: { coverImage: mediaId },
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

      // Throttle between books to avoid rate-limiting on external APIs
      if (THROTTLE_MS > 0) {
        await new Promise((r) => setTimeout(r, THROTTLE_MS))
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
