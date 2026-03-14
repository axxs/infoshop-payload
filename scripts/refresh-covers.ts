/**
 * Refresh cover images via fresh ISBN lookup + multi-source waterfall.
 *
 * For every book with an ISBN, re-runs the metadata lookup to get the latest
 * cover URL from Google Books / Open Library / WorldCat, then passes it
 * through the cover waterfall (OL CDN, fife variant, longitood.com) so a
 * real image is found even when the primary source returns a placeholder.
 *
 * Usage: npx tsx scripts/refresh-covers.ts
 *
 * Options (env vars):
 *   BATCH_SIZE=500    Number of books to process (default: 500)
 *   DELAY_MS=500      Delay between books in ms (default: 500)
 *   ONLY_MISSING=true Only process books that currently have no coverImage
 */

import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '../src/payload.config'
import { lookupBookByISBN } from '../src/lib/bookLookup'
import { downloadBestCoverImage } from '../src/lib/openLibrary/imageDownloader'

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '500', 10)
const DELAY_MS = parseInt(process.env.DELAY_MS || '500', 10)
const ONLY_MISSING = process.env.ONLY_MISSING === 'true'

async function refreshCovers() {
  const payload = await getPayload({ config })

  console.log('=== Refresh Cover Images (multi-source waterfall) ===')
  if (ONLY_MISSING) console.log('Mode: only books missing a coverImage')
  console.log('')

  const where: Where = ONLY_MISSING
    ? { and: [{ isbn: { exists: true } }, { coverImage: { exists: false } }] }
    : { isbn: { exists: true } }

  console.log('Fetching books with ISBNs...')

  const books = await payload.find({
    collection: 'books',
    where,
    limit: BATCH_SIZE,
    depth: 0,
    select: {
      id: true,
      title: true,
      isbn: true,
      coverImage: true,
    },
  })

  console.log(`Found ${books.docs.length} books\n`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const book of books.docs) {
    const isbn = book.isbn ?? undefined
    const title = book.title ?? 'Unknown Title'

    if (!isbn) {
      skipped++
      continue
    }

    const label = `${title} (ISBN: ${isbn})`
    console.log(`Processing: ${label}`)

    try {
      // Get metadata cover URL from lookup (first candidate in waterfall)
      const lookupResult = await lookupBookByISBN(isbn)
      const existingCoverUrl =
        lookupResult.success && lookupResult.data?.coverImageUrl
          ? lookupResult.data.coverImageUrl
          : undefined

      if (!existingCoverUrl) {
        console.log('  - No cover URL from lookup, trying CDN direct probes...')
      }

      // Run the multi-source cover waterfall
      const mediaId = await downloadBestCoverImage(payload, {
        isbn,
        existingCoverUrl,
        bookTitle: title,
        alt: `Cover of ${title}`,
        bookId: book.id,
      })

      if (mediaId) {
        await payload.update({
          collection: 'books',
          id: book.id,
          data: { coverImage: mediaId },
        })
        console.log(`  - Updated with media ID: ${mediaId}`)
        updated++
      } else {
        console.log('  - No suitable cover found across all sources, skipping')
        skipped++
      }
    } catch (error) {
      console.error(`  - Error: ${error instanceof Error ? error.message : 'Unknown'}`)
      failed++
    }

    // Throttle to avoid rate-limiting on external APIs
    if (DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, DELAY_MS))
    }
  }

  console.log('\n=== Results ===')
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Failed:  ${failed}`)

  process.exit(0)
}

refreshCovers().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
