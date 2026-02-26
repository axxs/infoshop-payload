/**
 * Re-download cover images from externalCoverUrl for all books missing local covers.
 *
 * After clearing broken coverImage references (via clear-broken-covers.ts),
 * this script re-downloads covers directly from each book's externalCoverUrl,
 * creates Payload media records, and links them back to the books.
 *
 * This is faster than refresh-covers.ts because it skips the ISBN lookup step
 * and downloads directly from the URL already stored on each book.
 *
 * Usage: npx tsx scripts/redownload-covers.ts
 *
 * Options (env vars):
 *   BATCH_SIZE=50          Number of books to process per batch (default: 50)
 *   DELAY_MS=300           Delay between downloads in ms (default: 300)
 *   DRY_RUN=true           Preview what would be downloaded without doing it
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'
import { downloadCoverImageIfPresent } from '../src/lib/openLibrary/imageDownloader'
import { validateImageURL } from '../src/lib/urlValidator'

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10)
const DELAY_MS = parseInt(process.env.DELAY_MS || '300', 10)
const DRY_RUN = process.env.DRY_RUN === 'true'

async function main() {
  const payload = await getPayload({ config })

  console.log('=== Re-download Cover Images ===')
  if (DRY_RUN) console.log('*** DRY RUN — no changes will be made ***\n')

  // Find books that have an externalCoverUrl but no coverImage
  const { totalDocs } = await payload.find({
    collection: 'books',
    where: {
      externalCoverUrl: { exists: true },
      coverImage: { exists: false },
    },
    limit: 0,
    depth: 0,
  })

  console.log(`Found ${totalDocs} books with externalCoverUrl but no local cover\n`)

  if (totalDocs === 0) {
    console.log('Nothing to download')
    process.exit(0)
  }

  let downloaded = 0
  let skipped = 0
  let failed = 0

  for (;;) {
    const batch = await payload.find({
      collection: 'books',
      where: {
        externalCoverUrl: { exists: true },
        coverImage: { exists: false },
      },
      limit: BATCH_SIZE,
      page: 1, // Always page 1 since we update records as we go
      depth: 0,
      select: {
        id: true,
        title: true,
        isbn: true,
        externalCoverUrl: true,
      },
    })

    if (batch.docs.length === 0) break

    for (const book of batch.docs) {
      const url = book.externalCoverUrl
      const progress = `[${downloaded + skipped + failed + 1}/${totalDocs}]`

      if (!url || typeof url !== 'string') {
        console.log(`  ${progress} ${book.title} — no URL, skipping`)
        skipped++
        continue
      }

      const validatedUrl = validateImageURL(url)
      if (!validatedUrl) {
        console.log(`  ${progress} ${book.title} — invalid URL, skipping`)
        skipped++
        continue
      }

      if (DRY_RUN) {
        console.log(`  ${progress} ${book.title} — would download from ${validatedUrl}`)
        downloaded++
        continue
      }

      try {
        console.log(`  ${progress} ${book.title} — downloading...`)
        const mediaId = await downloadCoverImageIfPresent(payload, validatedUrl, {
          bookTitle: book.title,
          alt: `Cover of ${book.title}`,
        })

        if (mediaId) {
          await payload.update({
            collection: 'books',
            id: book.id,
            data: { coverImage: mediaId },
          })
          console.log(`         ✓ saved as media #${mediaId}`)
          downloaded++
        } else {
          console.log(`         ✗ download returned no media (placeholder or too small)`)
          skipped++
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.log(`         ✗ ${msg}`)
        failed++
      }

      // Throttle to avoid hammering Open Library
      if (DELAY_MS > 0) {
        await new Promise((r) => setTimeout(r, DELAY_MS))
      }
    }
  }

  console.log('\n=== Results ===')
  console.log(`Downloaded: ${downloaded}`)
  console.log(`Skipped:    ${skipped}`)
  console.log(`Failed:     ${failed}`)
  console.log(`Total:      ${downloaded + skipped + failed}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
