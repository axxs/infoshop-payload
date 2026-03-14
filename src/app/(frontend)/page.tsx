export const dynamic = 'force-dynamic'

import { getPayload } from 'payload'
import config from '@payload-config'
import { BlockRenderer } from './components/blocks/BlockRenderer'

export default async function HomePage() {
  const payload = await getPayload({ config })

  try {
    // Fetch homepage from Pages collection (slug = "home")
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: 'home' } },
      limit: 1,
      depth: 2,
    })

    const homePage = docs[0]

    if (!homePage) {
      // Fallback: try Layout global for backwards compatibility
      const layout = await payload.findGlobal({ slug: 'layout' })
      const layoutBlocks = (layout as { blocks?: unknown[] }).blocks || []

      if (layoutBlocks.length > 0) {
        return (
          <BlockRenderer
            blocks={layoutBlocks as Parameters<typeof BlockRenderer>[0]['blocks']}
          />
        )
      }

      return (
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-4 text-4xl font-bold">Welcome to Infoshop</h1>
          <p className="text-lg text-muted-foreground">
            Homepage not yet configured. Create a page with slug &quot;home&quot; in the admin panel.
          </p>
        </div>
      )
    }

    const blocks = (homePage.blocks as Parameters<typeof BlockRenderer>[0]['blocks']) || []

    if (blocks.length === 0) {
      return (
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="mb-4 text-4xl font-bold">Welcome to Infoshop</h1>
          <p className="text-lg text-muted-foreground">
            Homepage blocks not yet configured. Add blocks to the &quot;Home&quot; page in the admin panel.
          </p>
        </div>
      )
    }

    return <BlockRenderer blocks={blocks} />
  } catch (_error) {
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
