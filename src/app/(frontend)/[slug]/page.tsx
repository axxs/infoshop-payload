import type { Metadata } from 'next'
import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { BlockRenderer } from '../components/blocks/BlockRenderer'
import type { Page } from '@/payload-types'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const dynamicParams = true

export async function generateStaticParams() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { _status: { equals: 'published' } },
    limit: 1000,
    select: { slug: true },
  })

  return docs
    .filter((doc) => doc.slug && doc.slug !== 'home')
    .map((doc) => ({ slug: doc.slug as string }))
}

const getPage = cache(async (slug: string): Promise<Page | null> => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })
  return (docs[0] as Page) ?? null
})

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)

  if (!page) return { title: 'Page Not Found' }

  const metadata: Metadata = {
    title: page.title,
  }

  if (page.description) {
    metadata.description = page.description
  }

  if (page.featuredImage && typeof page.featuredImage === 'object') {
    const img = page.featuredImage as { url?: string }
    if (img.url) {
      metadata.openGraph = {
        images: [{ url: img.url }],
      }
    }
  }

  return metadata
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params
  const page = await getPage(slug)

  if (!page) {
    notFound()
  }

  const pageBlocks = (page.blocks as Parameters<typeof BlockRenderer>[0]['blocks']) || []

  if (pageBlocks.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="mb-4 text-4xl font-bold">{page.title}</h1>
        <p className="text-lg text-muted-foreground">This page has no content yet.</p>
      </div>
    )
  }

  return <BlockRenderer blocks={pageBlocks} />
}
