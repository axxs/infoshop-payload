import { getPayload } from 'payload'
import config from '@payload-config'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { formatPrice, getStockStatusLabel } from '@/lib/utils'
import { ArrowLeft, ShoppingCart } from 'lucide-react'

interface BookPageProps {
  params: Promise<{ id: string }>
}

export default async function BookPage({ params }: BookPageProps) {
  const { id } = await params
  const payload = await getPayload({ config })

  const book = await payload.findByID({
    collection: 'books',
    id,
    depth: 2,
  })

  if (!book) {
    notFound()
  }

  const coverUrl =
    typeof book.coverImage === 'object' && book.coverImage?.url
      ? book.coverImage.url
      : book.externalCoverUrl || '/placeholder-book.png'

  const isOutOfStock = book.stockStatus === 'OUT_OF_STOCK'
  const isDiscontinued = book.stockStatus === 'DISCONTINUED'
  const isLowStock = book.stockStatus === 'LOW_STOCK'
  const canPurchase = !isOutOfStock && !isDiscontinued

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

      <div className="grid gap-8 md:grid-cols-2">
        {/* Cover Image Section */}
        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border bg-muted">
          <Image src={coverUrl} alt={book.title} fill className="object-cover" priority />
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
                <span className="text-3xl font-bold">
                  {formatPrice(book.sellPrice, book.currency)}
                </span>
                {book.memberPrice < book.sellPrice && (
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Member Price</span>
                    <span className="text-xl font-semibold text-primary">
                      {formatPrice(book.memberPrice, book.currency)}
                    </span>
                  </div>
                )}
              </div>

              <Button className="mt-4 w-full" size="lg" disabled={!canPurchase}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                {canPurchase ? 'Add to Cart' : getStockStatusLabel(book.stockStatus)}
              </Button>

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

      {/* Description Section - TODO: Implement Lexical renderer */}
      {/* book.description is a Lexical rich text object, needs proper rendering */}
    </div>
  )
}
