/**
 * Clear broken coverImage references from all books.
 *
 * After media files were lost from disk, the coverImage relation still points
 * to media records whose files no longer exist. This prevents the
 * externalCoverUrl fallback from working. This script nulls out coverImage
 * on every book so the external URLs take over immediately.
 *
 * Usage: npx tsx scripts/clear-broken-covers.ts
 */

import { getPayload } from 'payload'
import config from '../src/payload.config'

async function main() {
  const payload = await getPayload({ config })

  // Find all books that have a coverImage set
  const { docs: books, totalDocs } = await payload.find({
    collection: 'books',
    where: {
      coverImage: { exists: true },
    },
    limit: 0, // Get count only first
    depth: 0,
  })

  console.log(`Found ${totalDocs} books with coverImage references`)

  if (totalDocs === 0) {
    console.log('Nothing to clear')
    process.exit(0)
  }

  // Fetch all in batches
  const batchSize = 100
  let cleared = 0

  for (let page = 1; ; page++) {
    const batch = await payload.find({
      collection: 'books',
      where: {
        coverImage: { exists: true },
      },
      limit: batchSize,
      page,
      depth: 0,
      select: {
        id: true,
        title: true,
        coverImage: true,
        externalCoverUrl: true,
      },
    })

    if (batch.docs.length === 0) break

    for (const book of batch.docs) {
      await payload.update({
        collection: 'books',
        id: book.id,
        data: {
          coverImage: null,
        },
      })
      cleared++
      const fallback = book.externalCoverUrl ? 'externalCoverUrl' : 'placeholder'
      console.log(`  [${cleared}/${totalDocs}] ${book.title} → ${fallback}`)
    }
  }

  console.log(`\nCleared ${cleared} broken coverImage references`)

  // Also clean up orphaned media records (files that no longer exist)
  const { totalDocs: mediaCount } = await payload.find({
    collection: 'media',
    limit: 0,
    depth: 0,
  })
  console.log(`\n${mediaCount} media records remain in database`)
  console.log('Consider deleting orphaned media records via the admin panel if needed')

  process.exit(0)
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
