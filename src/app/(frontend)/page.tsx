export const dynamic = 'force-dynamic'

import { getPayload } from 'payload'
import config from '@payload-config'
import { BlockRenderer } from './components/blocks/BlockRenderer'

export default async function HomePage() {
  const payload = await getPayload({ config })

  try {
    // Fetch the Layout Global to get homepage blocks
    const layout = await payload.findGlobal({
      slug: 'layout',
    })

    // Extract blocks from the Layout Global
    const blocks = layout.blocks || []

    if (blocks.length === 0) {
      // Fallback message if no blocks are configured
      return (
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-4 text-4xl font-bold">Welcome to Infoshop</h1>
          <p className="text-lg text-muted-foreground">
            Homepage blocks not yet configured. Please add blocks via the Payload admin panel.
          </p>
        </div>
      )
    }

    return <BlockRenderer blocks={blocks} />
  } catch (_error) {
    // Fallback if Layout Global doesn't exist yet
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="mb-4 text-4xl font-bold">Welcome to Infoshop</h1>
        <p className="text-lg text-muted-foreground">
          Layout configuration not found. Please configure the Layout Global in the Payload admin
          panel.
        </p>
      </div>
    )
  }
}
