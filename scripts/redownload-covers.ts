/**
 * Re-download cover images for books missing local covers.
 *
 * For books that have an ISBN, runs the full multi-source waterfall
 * (metadata URL → OL CDN ISBN-13 → OL CDN ISBN-10 → longitood.com).
 * For books without an ISBN but with an externalCoverUrl, falls back
 * to downloading that URL directly (legacy behaviour).
 *
 * This is useful after clearing broken coverImage references via
 * clear-broken-covers.ts, or as a standalone pass over the catalogue.
 *
 * Usage: npx tsx scripts/redownload-covers.ts
 *
 * Options (env vars):
 *   BATCH_SIZE=50   Number of books to process per batch (default: 50)
 *   DELAY_MS=300    Delay between downloads in ms (default: 300)
 *   DRY_RUN=true    Preview what would be downloaded without doing it
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'
import {
  downloadBestCoverImage,
  downloadCoverImageIfPresent,
} from '../src/lib/openLibrary/imageDownloader'
import { validateImageURL } from '../src/lib/urlValidator'

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10)
const DELAY_MS = parseInt(process.env.DELAY_MS || '300', 10)
const DRY_RUN = process.env.DRY_RUN === 'true'

async function main() {
  const payload = await getPayload({ config })

  console.log('=== Re-download Cover Images (multi-source waterfall) ===')
  if (DRY_RUN) console.log('*** DRY RUN — no changes will be made ***\n')

  // Find books that have no coverImage (with or without externalCoverUrl)
  const { totalDocs } = await payload.find({
    collection: 'books',
    where: { coverImage: { exists: false } },
    limit: 0,
    depth: 0,
  })

  console.log(`Found ${totalDocs} books without a local cover\n`)

  if (totalDocs === 0) {
    console.log('Nothing to download')
    process.exit(0)
  }

  let downloaded = 0
  let previewed = 0
  let skipped = 0
  let failed = 0

  for (;;) {
    const batch = await payload.find({
      collection: 'books',
      where: { coverImage: { exists: false } },
      limit: BATCH_SIZE,
      page: 1, // Always page 1 since we update records as we go
      depth: 0,
      select: {
        title: true,
        isbn: true,
        externalCoverUrl: true,
      },
    })

    if (batch.docs.length === 0) break

    for (const book of batch.docs) {
      const isbn = book.isbn ?? undefined
      const title = book.title ?? 'Unknown Title'
      const externalUrl = book.externalCoverUrl ?? undefined
      const progress = `[${downloaded + skipped + failed + 1}/${totalDocs}]`

      if (DRY_RUN) {
        if (isbn) {
          console.log(`  ${progress} ${title} — would run cover waterfall (ISBN: ${isbn})`)
        } else if (externalUrl) {
          console.log(`  ${progress} ${title} — would download from ${externalUrl}`)
        } else {
          console.log(`  ${progress} ${title} — no ISBN or URL, would skip`)
        }
        previewed++
        continue
      }

      try {
        let mediaId: number | null = null

        if (isbn) {
          // Multi-source waterfall: metadata URL → OL CDN → longitood.com
          const existingCoverUrl = externalUrl
            ? (validateImageURL(externalUrl) ?? undefined)
            : undefined

          console.log(`  ${progress} ${title} — running cover waterfall (ISBN: ${isbn})...`)
          mediaId = await downloadBestCoverImage(payload, {
            isbn,
            existingCoverUrl,
            bookTitle: title,
            alt: `Cover of ${title}`,
            bookId: book.id,
          })
        } else if (externalUrl) {
          // No ISBN — try the stored external URL directly
          const validatedUrl = validateImageURL(externalUrl)
          if (!validatedUrl) {
            console.log(`  ${progress} ${title} — invalid URL, skipping`)
            skipped++
            continue
          }
          console.log(`  ${progress} ${title} — downloading from ${validatedUrl}...`)
          mediaId = await downloadCoverImageIfPresent(payload, validatedUrl, {
            bookTitle: title,
            alt: `Cover of ${title}`,
          })
        } else {
          console.log(`  ${progress} ${title} — no ISBN or external URL, skipping`)
          skipped++
          continue
        }

        if (mediaId) {
          await payload.update({
            collection: 'books',
            id: book.id,
            data: { coverImage: mediaId },
          })
          console.log(`         ✓ saved as media #${mediaId}`)
          downloaded++
        } else {
          console.log(`         ✗ no suitable cover found across all sources`)
          skipped++
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.log(`         ✗ ${msg}`)
        failed++
      }

      // Throttle to avoid rate-limiting on external APIs
      if (DELAY_MS > 0) {
        await new Promise((r) => setTimeout(r, DELAY_MS))
      }
    }
  }

  console.log('\n=== Results ===')
  if (DRY_RUN) {
    console.log(`Would process: ${previewed}`)
  } else {
    console.log(`Downloaded: ${downloaded}`)
  }
  console.log(`Skipped:    ${skipped}`)
  console.log(`Failed:     ${failed}`)
  console.log(`Total:      ${(DRY_RUN ? previewed : downloaded) + skipped + failed}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
