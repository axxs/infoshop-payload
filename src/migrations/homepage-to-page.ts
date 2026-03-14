/**
 * One-time migration: copy homepage blocks from Layout global → Pages("home")
 *
 * Run with: npx tsx src/migrations/homepage-to-page.ts
 *
 * This script:
 * 1. Reads the Layout global's blocks field
 * 2. Creates (or updates) a Pages document with slug "home"
 * 3. Copies all blocks to the new page
 *
 * Safe to run multiple times — it upserts by slug.
 */

import { getPayload } from 'payload'
import config from '@payload-config'

async function migrate() {
  const payload = await getPayload({ config })

  console.log('Reading Layout global...')
  const layout = await payload.findGlobal({ slug: 'layout' })

  const blocks = (layout as { blocks?: unknown[] }).blocks || []

  if (blocks.length === 0) {
    console.log('No blocks found in Layout global. Nothing to migrate.')
    process.exit(0)
  }

  console.log(`Found ${blocks.length} blocks in Layout global.`)

  // Check if a "home" page already exists
  const { docs: existing } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
  })

  if (existing.length > 0) {
    console.log('Updating existing "home" page...')
    await payload.update({
      collection: 'pages',
      id: existing[0].id,
      data: {
        title: 'Home',
        blocks: blocks as never[],
        _status: 'published',
      },
    })
    console.log(`Updated page ID ${existing[0].id}`)
  } else {
    console.log('Creating new "home" page...')
    const page = await payload.create({
      collection: 'pages',
      data: {
        title: 'Home',
        slug: 'home',
        blocks: blocks as never[],
        _status: 'published',
      },
    })
    console.log(`Created page ID ${page.id}`)
  }

  console.log('Migration complete. Homepage blocks copied to Pages("home").')
  console.log('You can now remove the Homepage tab from Layout global.')
  process.exit(0)
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
