/**
 * One-time migration: backfill URL slugs for all existing books
 * Run with: pnpm backfill:book-slugs
 */

import { config as dotenvConfig } from 'dotenv'
import { resolve } from 'path'
dotenvConfig({ path: resolve(process.cwd(), '.env') })

import { getPayload } from 'payload'
import payloadConfig from '../payload.config'
import { slugify, generateUniqueSlug } from '../collections/utils/slugify'

async function backfillBookSlugs() {
  console.log('Starting book slug backfill...')

  const payload = await getPayload({ config: payloadConfig })

  // Fetch all books (paginated)
  let page = 1
  const limit = 100
  let totalUpdated = 0
  let totalSkipped = 0

  // Track all slugs we've already assigned in this run to prevent in-batch conflicts
  const assignedSlugs = new Set<string>()

  // Pre-load existing slugs from DB so we don't conflict with already-slugged books
  const { docs: sluggedBooks } = await payload.find({
    collection: 'books',
    where: { slug: { exists: true } },
    limit: 10000,
    select: { slug: true },
  })
  for (const book of sluggedBooks) {
    if (book.slug) assignedSlugs.add(book.slug)
  }

  console.log(`Found ${assignedSlugs.size} books already with slugs.`)

  // Process books that have no slug yet
  while (true) {
    const { docs: books, totalDocs, hasNextPage } = await payload.find({
      collection: 'books',
      where: {
        or: [{ slug: { exists: false } }, { slug: { equals: '' } }],
      },
      limit,
      page,
      select: { id: true, title: true, slug: true },
    })

    if (books.length === 0) break

    console.log(`Processing batch of ${books.length} books (page ${page}, total needing slugs: ${totalDocs})...`)

    for (const book of books) {
      if (!book.title) {
        console.warn(`  SKIP book ${book.id} — no title`)
        totalSkipped++
        continue
      }

      const baseSlug = slugify(book.title)
      const slug = generateUniqueSlug(baseSlug, Array.from(assignedSlugs))

      try {
        await payload.update({
          collection: 'books',
          id: book.id,
          data: { slug },
          context: {
            skipSubjectProcessing: true,
            skipInventoryHooks: true,
          },
        })

        assignedSlugs.add(slug)
        totalUpdated++
        console.log(`  ✅ "${book.title}" → "${slug}"`)
      } catch (err) {
        console.error(`  ❌ Failed to update book ${book.id} ("${book.title}"):`, err instanceof Error ? err.message : err)
        totalSkipped++
      }
    }

    if (!hasNextPage) break
    page++
  }

  console.log(`\nBackfill complete.`)
  console.log(`  Updated: ${totalUpdated}`)
  console.log(`  Skipped: ${totalSkipped}`)

  process.exit(0)
}

backfillBookSlugs().catch((err) => {
  console.error('Fatal error during backfill:', err)
  process.exit(1)
})
