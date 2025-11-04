import { Suspense } from 'react'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import { BookGrid } from '../components/books/BookGrid'
import { SearchBar } from '../components/shop/SearchBar'
import { SortSelect } from '../components/shop/SortSelect'

interface ShopPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    sort?: string
  }>
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const payload = await getPayload({ config })
  const params = await searchParams

  const page = Number(params.page) || 1
  const limit = 20

  // Build query
  const where: Where = {
    stockStatus: {
      not_in: ['OUT_OF_STOCK', 'DISCONTINUED'],
    },
  }

  // Add search query
  if (params.search) {
    where.or = [
      { title: { contains: params.search } },
      { author: { contains: params.search } },
      { isbn: { contains: params.search } },
    ]
  }

  // Determine sort
  let sort = '-createdAt' // Default: newest first
  if (params.sort === 'title') sort = 'title'
  if (params.sort === 'price-low') sort = 'sellPrice'
  if (params.sort === 'price-high') sort = '-sellPrice'

  // Fetch books
  const { docs: books, totalDocs } = await payload.find({
    collection: 'books',
    where,
    limit,
    page,
    sort,
    depth: 2, // Include categories, subjects, coverImage
  })

  const totalPages = Math.ceil(totalDocs / limit)

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Shop Books</h1>
        <p className="mt-2 text-muted-foreground">
          {totalDocs} {totalDocs === 1 ? 'book' : 'books'} available
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Suspense fallback={<div className="h-10 flex-1 animate-pulse rounded-md bg-muted" />}>
          <SearchBar />
        </Suspense>
        <Suspense fallback={<div className="h-10 w-[180px] animate-pulse rounded-md bg-muted" />}>
          <SortSelect />
        </Suspense>
      </div>

      <BookGrid books={books} />

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/shop?page=${page - 1}${params.search ? `&search=${params.search}` : ''}${params.sort ? `&sort=${params.sort}` : ''}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
            >
              Previous
            </a>
          )}
          <span className="flex items-center px-4 py-2">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/shop?page=${page + 1}${params.search ? `&search=${params.search}` : ''}${params.sort ? `&sort=${params.sort}` : ''}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  )
}
