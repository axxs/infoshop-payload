import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { formatPrice, getStockStatusLabel } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { BookCoverImage } from '../../components/books/BookCoverImage'
import { AddToCartButton } from '../../components/cart/AddToCartButton'
import type { Book } from '@/payload-types'

interface BookPageProps {
  params: Promise<{ slug: string }>
}

/**
 * Look up a book by its slug, with a numeric-ID fallback for backward compatibility.
 * Returns null when no match is found.
 */
async function findBook(slug: string): Promise<Book | null> {
  const payload = await getPayload({ config })

  // Primary: look up by slug field
  const { docs } = await payload.find({
    collection: 'books',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 2,
  })

  if (docs.length > 0) return docs[0] as Book

  // Fallback: if the segment looks like a numeric ID, try findByID
  if (/^\d+$/.test(slug)) {
    try {
      const book = await payload.findByID({
        collection: 'books',
        id: Number(slug),
        depth: 2,
      })
      return book as Book
    } catch {
      return null
    }
  }

  return null
}

export default async function BookPage({ params }: BookPageProps) {
  const { slug } = await params
  const book = await findBook(slug)

  if (!book) {
    notFound()
  }

  // Canonical redirect: if accessed via numeric ID but book has a slug,
  // redirect to the slug-based URL so only one URL serves this resource
  if (/^\d+$/.test(slug) && book.slug) {
    permanentRedirect(`/shop/${book.slug}`)
  }

  const coverUrl =
    typeof book.coverImage === 'object' &&
    book.coverImage !== null &&
    'url' in book.coverImage &&
    book.coverImage.url
      ? book.coverImage.url
      : book.externalCoverUrl || '/placeholder-book.svg'

  const isOutOfStock = book.stockStatus === 'OUT_OF_STOCK'
  const isDiscontinued = book.stockStatus === 'DISCONTINUED'
  const isLowStock = book.stockStatus === 'LOW_STOCK'
  const isUnpriced = !book.sellPrice || book.sellPrice === 0
  const canPurchase =
    !isOutOfStock && !isDiscontinued && !isUnpriced && (book.stockQuantity ?? 0) > 0

  // Extract subjects (many-to-many relation)
  const subjects =
    book.subjects && Array.isArray(book.subjects)
      ? book.subjects
          .map((subject) => (typeof subject === 'object' ? subject.name : null))
          .filter(Boolean)
      : []

  // Extract categories (many-to-many relation)
  const categories =
    book.categories && Array.isArray(book.categories)
      ? book.categories.map((cat) => (typeof cat === 'object' ? cat.name : null)).filter(Boolean)
      : []

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/shop"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Shop
      </Link>

      <div className="grid gap-8 md:grid-cols-[300px_1fr] lg:grid-cols-[350px_1fr]">
        {/* Cover Image Section */}
        <div className="relative aspect-[2/3] max-w-[350px] overflow-hidden rounded-lg border bg-muted">
          <BookCoverImage src={coverUrl} alt={book.title} fill className="object-cover" priority />
          {(isOutOfStock || isDiscontinued) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Badge variant="destructive" className="text-lg">
                {getStockStatusLabel(book.stockStatus)}
              </Badge>
            </div>
          )}
        </div>

        {/* Book Details Section */}
        <div className="flex flex-col">
          <div className="mb-4">
            <h1 className="mb-2 text-3xl font-bold">{book.title}</h1>
            <p className="text-xl text-muted-foreground">{book.author}</p>
          </div>

          {/* Badges Section */}
          <div className="mb-4 flex flex-wrap gap-2">
            {subjects.length > 0
              ? subjects.map((subject, idx) => (
                  <Badge key={idx} variant="secondary">
                    {subject}
                  </Badge>
                ))
              : categories.length > 0
                ? categories.map((cat, idx) => (
                    <Badge key={idx} variant="secondary">
                      {cat}
                    </Badge>
                  ))
                : null}
            {isLowStock && (
              <Badge variant="warning">
                {getStockStatusLabel(book.stockStatus, book.stockQuantity)}
              </Badge>
            )}
          </div>

          {/* Price Section */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-baseline gap-4">
                {isUnpriced ? (
                  <span className="text-2xl font-semibold text-muted-foreground">
                    Price on request
                  </span>
                ) : (
                  <>
                    <span className="text-3xl font-bold">
                      {formatPrice(book.sellPrice ?? 0, book.currency)}
                    </span>
                    {(book.memberPrice ?? 0) < (book.sellPrice ?? 0) && (
                      <div className="flex flex-col">
                        <span className="text-sm text-muted-foreground">Member Price</span>
                        <span className="text-xl font-semibold text-primary">
                          {formatPrice(book.memberPrice ?? 0, book.currency)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="mt-4">
                {canPurchase ? (
                  <AddToCartButton
                    bookId={book.id}
                    title={book.title}
                    stockQuantity={book.stockQuantity || 0}
                    sellPrice={book.sellPrice}
                    size="lg"
                    className="w-full"
                  />
                ) : isUnpriced && !isDiscontinued ? (
                  <a
                    href="/contact"
                    className="inline-flex w-full items-center justify-center rounded-md border border-primary bg-transparent px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    Contact for Pricing
                  </a>
                ) : null}
              </div>

              {canPurchase && book.stockQuantity !== undefined && book.stockQuantity > 0 && (
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {book.stockQuantity} in stock
                </p>
              )}
            </CardContent>
          </Card>

          {/* Book Information */}
          <Card>
            <CardHeader>
              <CardTitle>Book Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {book.isbn && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ISBN:</span>
                  <span className="font-medium">{book.isbn}</span>
                </div>
              )}
              {book.publisher && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Publisher:</span>
                  <span className="font-medium">{book.publisher}</span>
                </div>
              )}
              {book.publishedDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Published:</span>
                  <span className="font-medium">
                    {new Date(book.publishedDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {book.pages && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pages:</span>
                  <span className="font-medium">{book.pages}</span>
                </div>
              )}
              {book.format && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format:</span>
                  <span className="font-medium">{book.format}</span>
                </div>
              )}
              {categories.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Categories:</span>
                  <span className="font-medium text-right">{categories.join(', ')}</span>
                </div>
              )}
              {subjects.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subjects:</span>
                  <span className="font-medium text-right">{subjects.join(', ')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Synopsis Section */}
      {book.synopsis && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>About This Book</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {book.synopsis}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Description Section — Lexical rich text renderer needed for book.description */}
    </div>
  )
}
