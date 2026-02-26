import type { Metadata } from 'next'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookGrid } from '../../../components/books/BookGrid'
import { ArrowLeft } from 'lucide-react'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
  })
  const category = docs[0]
  if (!category) return { title: 'Category Not Found' }
  return {
    title: category.name,
    description: category.description || `Browse books in ${category.name}`,
  }
}

interface CategoryPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    page?: string
  }>
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params
  const searchParamsResolved = await searchParams
  const payload = await getPayload({ config })

  // Find the category by slug
  const { docs: categories } = await payload.find({
    collection: 'categories',
    where: {
      slug: {
        equals: slug,
      },
    },
    limit: 1,
  })

  const category = categories[0]
  if (!category) {
    notFound()
  }

  const page = Number(searchParamsResolved.page) || 1
  const limit = 24

  // Build query for books in this category
  const where: Where = {
    categories: {
      contains: category.id,
    },
    stockStatus: {
      not_in: ['OUT_OF_STOCK', 'DISCONTINUED'],
    },
  }

  // Fetch books
  const { docs: books, totalDocs } = await payload.find({
    collection: 'books',
    where,
    limit,
    page,
    sort: '-createdAt',
    depth: 2,
  })

  const totalPages = Math.ceil(totalDocs / limit)

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/shop/categories"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Categories
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {totalDocs} {totalDocs === 1 ? 'book' : 'books'} available
        </p>
      </div>

      <BookGrid books={books} />

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/shop/categories/${slug}?page=${page - 1}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
            >
              Previous
            </Link>
          )}
          <span className="flex items-center px-4 py-2">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/shop/categories/${slug}?page=${page + 1}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
