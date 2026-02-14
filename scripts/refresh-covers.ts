import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { lookupBookByISBN } from '../src/lib/bookLookup'
import { downloadCoverImageIfPresent } from '../src/lib/openLibrary/imageDownloader'
import { validateImageURL } from '../src/lib/urlValidator'

async function refreshCovers() {
  const payload = await getPayload({ config })

  console.log('Fetching books with ISBNs...')

  const books = await payload.find({
    collection: 'books',
    where: { isbn: { exists: true } },
    limit: 500,
    depth: 0,
    select: {
      id: true,
      title: true,
      isbn: true,
      coverImage: true,
    },
  })

  console.log(`Found ${books.docs.length} books with ISBNs`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const book of books.docs) {
    if (!book.isbn) {
      skipped++
      continue
    }

    console.log(`Processing: ${book.title} (ISBN: ${book.isbn})`)

    try {
      const lookupResult = await lookupBookByISBN(book.isbn)

      if (!lookupResult.success || !lookupResult.data?.coverImageUrl) {
        console.log('  - No cover found, skipping')
        skipped++
        continue
      }

      const validatedUrl = validateImageURL(lookupResult.data.coverImageUrl)
      if (!validatedUrl) {
        console.log('  - Invalid URL, skipping')
        skipped++
        continue
      }

      console.log(`  - Downloading from: ${validatedUrl}`)

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
        console.log(`  - Updated with media ID: ${mediaId}`)
        updated++
      } else {
        console.log('  - Download failed, skipping')
        skipped++
      }
    } catch (error) {
      console.error(`  - Error: ${error instanceof Error ? error.message : 'Unknown'}`)
      failed++
    }

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 500))
  }

  console.log('\n=== Results ===')
  console.log(`Updated: ${updated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Failed: ${failed}`)

  process.exit(0)
}

refreshCovers().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
