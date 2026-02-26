import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import { BookGrid } from '../components/books/BookGrid'
import { SearchBar } from '../components/shop/SearchBar'
import { SortSelect } from '../components/shop/SortSelect'
import { sanitizeSearchInput } from '@/lib/utils'
import type { Book } from '@/payload-types'
import { ScrollReveal } from '../components/cinematic/ScrollReveal'

export const metadata: Metadata = {
  title: 'Shop Books',
  description: 'Browse our collection of books available for purchase',
}

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

  // Fetch theme settings for shop visibility options
  const theme = (await payload.findGlobal({
    slug: 'theme',
  })) as {
    showOutOfStockBooks?: boolean
    showUnpricedBooks?: boolean
    contactEmail?: string
    contactPageUrl?: string
  }

  const showOutOfStockBooks = theme?.showOutOfStockBooks ?? false
  const showUnpricedBooks = theme?.showUnpricedBooks ?? false
  const contactEmail = theme?.contactEmail
  const contactPageUrl = theme?.contactPageUrl

  const page = Number(params.page) || 1
  const limit = 24

  // Build query based on visibility settings
  const stockStatusExclusions: string[] = ['DISCONTINUED']
  if (!showOutOfStockBooks) {
    stockStatusExclusions.push('OUT_OF_STOCK')
  }

  // Build base conditions
  const conditions: Where[] = [
    {
      stockStatus: {
        not_in: stockStatusExclusions,
      },
    },
  ]

  // Exclude books without pricing unless showUnpricedBooks is enabled
  if (!showUnpricedBooks) {
    conditions.push({
      sellPrice: { greater_than: 0 },
    })
  }

  // Add search query (sanitized)
  const sanitizedSearch = sanitizeSearchInput(params.search)
  if (sanitizedSearch) {
    conditions.push({
      or: [
        { title: { contains: sanitizedSearch } },
        { author: { contains: sanitizedSearch } },
        { isbn: { contains: sanitizedSearch } },
      ],
    })
  }

  const where: Where = conditions.length > 1 ? { and: conditions } : conditions[0]

  // Determine sort
  let sort = '-createdAt' // Default: newest first
  if (params.sort === 'title') sort = 'title'
  if (params.sort === 'price-low') sort = 'sellPrice'
  if (params.sort === 'price-high') sort = '-sellPrice'

  // Fetch books - select only needed fields to avoid date serialization issues
  const result = await payload.find({
    collection: 'books',
    where,
    limit,
    page,
    sort,
    depth: 1,
    select: {
      id: true,
      title: true,
      slug: true,
      author: true,
      synopsis: true,
      sellPrice: true,
      memberPrice: true,
      currency: true,
      stockQuantity: true,
      stockStatus: true,
      coverImage: true,
      externalCoverUrl: true,
      categories: true,
      subjects: true,
    },
  })

  // Convert to plain JSON to ensure RSC serialization works correctly
  const books: Book[] = JSON.parse(JSON.stringify(result.docs))

  const totalDocs = result.totalDocs
  const totalPages = Math.ceil(totalDocs / limit)

  return (
    <div className="container mx-auto px-4 py-8">
      <ScrollReveal className="mb-8">
        <h1 className="font-heading text-3xl font-bold">Shop Books</h1>
        <p className="mt-2 text-muted-foreground">
          {totalDocs} {totalDocs === 1 ? 'book' : 'books'} available
        </p>
      </ScrollReveal>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Suspense fallback={<div className="h-10 flex-1 animate-pulse rounded-md bg-muted" />}>
          <SearchBar />
        </Suspense>
        <Suspense fallback={<div className="h-10 w-[180px] animate-pulse rounded-md bg-muted" />}>
          <SortSelect />
        </Suspense>
      </div>

      <BookGrid books={books} contactEmail={contactEmail} contactPageUrl={contactPageUrl} />

      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <a
              href={`/shop?page=${page - 1}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}${params.sort ? `&sort=${params.sort}` : ''}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
              aria-label="Go to previous page"
            >
              Previous
            </a>
          )}
          <span className="flex items-center px-4 py-2" aria-current="page">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/shop?page=${page + 1}${params.search ? `&search=${encodeURIComponent(params.search)}` : ''}${params.sort ? `&sort=${params.sort}` : ''}`}
              className="rounded-md border px-4 py-2 hover:bg-accent"
              aria-label="Go to next page"
            >
              Next
            </a>
          )}
        </div>
      )}
    </div>
  )
}
