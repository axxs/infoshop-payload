import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { BlockRenderer } from '../../components/blocks/BlockRenderer'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { formatDate } from '@/lib/dates'

interface PostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'posts',
    limit: 1000,
    select: { slug: true },
  })

  return docs
    .filter((doc) => doc.slug)
    .map((doc) => ({ slug: doc.slug as string }))
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 1,
  })

  const post = docs[0]
  if (!post) return { title: 'Post Not Found' }

  const metadata: Metadata = {
    title: post.title,
  }

  if (post.excerpt) {
    metadata.description = post.excerpt as string
  }

  if (post.featuredImage && typeof post.featuredImage === 'object' && post.featuredImage !== null) {
    const img = post.featuredImage as { url?: string }
    if (img.url) {
      metadata.openGraph = {
        images: [{ url: img.url }],
      }
    }
  }

  return metadata
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'posts',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })

  const post = docs[0]
  if (!post) {
    notFound()
  }

  const publishedDate = post.publishedDate
    ? formatDate(post.publishedDate)
    : null

  const author =
    post.author && typeof post.author === 'object'
      ? (post.author as { email?: string }).email
      : null

  const categories = Array.isArray(post.categories)
    ? post.categories
        .filter((c) => typeof c === 'object' && c !== null)
        .map((c) => (c as { name: string }).name)
    : []

  const postBlocks = (post.blocks as Parameters<typeof BlockRenderer>[0]['blocks']) || []

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/news"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to News
      </Link>

      <article>
        <header className="mb-8">
          <h1 className="mb-4 font-heading text-4xl font-bold">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {publishedDate && (
              <time dateTime={post.publishedDate as string}>{publishedDate}</time>
            )}
            {author && <span>by {author}</span>}
          </div>
          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((name) => (
                <Badge key={name} variant="secondary">
                  {name}
                </Badge>
              ))}
            </div>
          )}
        </header>

        {postBlocks.length > 0 ? (
          <BlockRenderer blocks={postBlocks} />
        ) : (
          <p className="py-12 text-center text-muted-foreground">This post has no content yet.</p>
        )}
      </article>
    </div>
  )
}
