import type { Metadata } from 'next'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { PostCard } from '../components/PostCard'
import { ScrollReveal } from '../components/cinematic/ScrollReveal'

export const metadata: Metadata = {
  title: 'News & Updates',
  description: 'Latest news and updates from the infoshop',
}

interface NewsPageProps {
  searchParams: Promise<{
    page?: string
  }>
}

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const payload = await getPayload({ config })
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const limit = 12

  const result = await payload.find({
    collection: 'posts',
    sort: '-publishedDate',
    limit,
    page,
    depth: 1,
  })

  const posts = result.docs
  const totalPages = result.totalPages

  return (
    <div className="container mx-auto px-4 py-8">
      <ScrollReveal className="mb-8">
        <h1 className="font-heading text-3xl font-bold">News & Updates</h1>
        <p className="mt-2 text-muted-foreground">
          {result.totalDocs} {result.totalDocs === 1 ? 'post' : 'posts'}
        </p>
      </ScrollReveal>

      {posts.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No posts yet. Check back soon.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
              <PostCard
                key={post.id}
                title={post.title}
                slug={post.slug ?? ''}
                excerpt={post.excerpt}
                publishedDate={post.publishedDate}
                featuredImage={
                  typeof post.featuredImage === 'object' ? post.featuredImage : null
                }
                categories={
                  post.categories
                    ?.filter((c) => typeof c === 'object')
                    .map((c) => ({ name: (c as { name: string }).name }))
                    ?? []
                }
              />
            ),
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/news?page=${page - 1}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
              aria-label="Go to previous page"
            >
              Previous
            </Link>
          )}
          <span className="flex items-center px-4 py-2" aria-current="page">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/news?page=${page + 1}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
              aria-label="Go to next page"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
