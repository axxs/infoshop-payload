/**
 * Backfill Missing Cover Images
 *
 * Scans every book in the catalogue that lacks a local coverImage and runs
 * the multi-source cover waterfall to find and store one.
 *
 * Waterfall order per book:
 *   1. externalCoverUrl stored on the book (if valid)
 *   2. Open Library Covers CDN — isbn/{isbn13}-L.jpg
 *   3. Open Library Covers CDN — isbn/{isbn10}-L.jpg
 *   4. bookcover.longitood.com aggregator (last resort)
 *
 * Rate limiting:
 *   DELAY_MS controls the pause between each book (default 500 ms).
 *   Each probe inside the waterfall has its own 5 s timeout; a dead source
 *   never stalls the chain.  For large catalogues, increase DELAY_MS to
 *   avoid being throttled by Open Library or longitood.com.
 *
 * Usage:
 *   pnpm backfill:covers
 *   DRY_RUN=true pnpm backfill:covers   # preview without writing anything
 *   DELAY_MS=1000 pnpm backfill:covers  # slower, gentler on rate limits
 *
 * Options (env vars):
 *   BATCH_SIZE=50    Books processed per DB page (default: 50)
 *   DELAY_MS=500     Pause between books in ms (default: 500)
 *   DRY_RUN=true     Preview without downloading or writing to DB
 *   START_PAGE=1     Resume from a specific page (default: 1)
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { downloadBestCoverImage } from '../src/lib/openLibrary/imageDownloader'
import { validateImageURL } from '../src/lib/urlValidator'

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '50', 10)
const DELAY_MS = parseInt(process.env.DELAY_MS || '500', 10)
const DRY_RUN = process.env.DRY_RUN === 'true'
const START_PAGE = parseInt(process.env.START_PAGE || '1', 10)

async function main() {
  const payload = await getPayload({ config })

  console.log('=== Backfill Missing Cover Images ===')
  if (DRY_RUN) console.log('*** DRY RUN — no changes will be made ***')
  console.log(`Batch size: ${BATCH_SIZE} | Delay: ${DELAY_MS} ms | Start page: ${START_PAGE}\n`)

  // Count how many books need covers
  const { totalDocs } = await payload.find({
    collection: 'books',
    where: { coverImage: { exists: false } },
    limit: 0,
    depth: 0,
  })

  if (totalDocs === 0) {
    console.log('All books already have cover images — nothing to do.')
    process.exit(0)
  }

  console.log(`Found ${totalDocs} books without a local cover image\n`)

  let found = 0
  let notFound = 0
  let failed = 0
  let processed = 0
  let page = START_PAGE

  for (;;) {
    const batch = await payload.find({
      collection: 'books',
      where: { coverImage: { exists: false } },
      limit: BATCH_SIZE,
      page,
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

      processed++
      const counter = `[${processed}/${totalDocs}]`

      if (!isbn) {
        // No ISBN — can't run the full waterfall, skip
        console.log(`  ${counter} ${title} — no ISBN, skipping`)
        notFound++
        continue
      }

      // The externalCoverUrl (stored from original import) is the first candidate
      const existingCoverUrl = externalUrl
        ? (validateImageURL(externalUrl) ?? undefined)
        : undefined

      if (DRY_RUN) {
        console.log(
          `  ${counter} ${title} (ISBN: ${isbn}) — would run waterfall` +
            (existingCoverUrl ? ` starting from ${existingCoverUrl}` : ''),
        )
        found++ // optimistic for dry run output
        continue
      }

      console.log(`  ${counter} ${title} (ISBN: ${isbn}) — resolving...`)

      try {
        const mediaId = await downloadBestCoverImage(payload, {
          isbn,
          existingCoverUrl,
          bookTitle: title,
          alt: `Cover of ${title}`,
        })

        if (mediaId) {
          await payload.update({
            collection: 'books',
            id: book.id,
            data: { coverImage: mediaId },
          })
          console.log(`         ✓ media #${mediaId}`)
          found++
        } else {
          console.log(`         ✗ no suitable cover found`)
          notFound++
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        console.log(`         ✗ error: ${msg}`)
        failed++
      }

      // Throttle between books — prevents rate-limiting on OL CDN and longitood.com
      if (DELAY_MS > 0) {
        await new Promise((r) => setTimeout(r, DELAY_MS))
      }
    }

    // Since we update records as we go (coverImage is set on found books), the
    // query result shifts. We only increment the page if we're in DRY_RUN mode
    // (no records change) or if the batch was a full page (there may be more).
    if (DRY_RUN) {
      if (!batch.hasNextPage) break
      page++
    } else {
      // In live mode: re-query page 1 each time since updated records drop
      // out of the result set. Break when the batch is empty (handled above).
      page = 1
    }
  }

  console.log('\n=== Results ===')
  console.log(`Found & downloaded: ${found}`)
  console.log(`Not found:          ${notFound}`)
  console.log(`Errors:             ${failed}`)
  console.log(`Total processed:    ${processed}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
