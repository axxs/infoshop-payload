import Link from 'next/link'
import { Book } from '@/payload-types'
import { Card, CardContent, CardFooter } from '../ui/card'
import { Badge } from '../ui/badge'
import { formatPrice, getStockStatusLabel } from '@/lib/utils'
import { BookCoverImage } from './BookCoverImage'
import { AddToCartButton } from '../cart/AddToCartButton'

interface BookCardProps {
  book: Book
  contactEmail?: string
  contactPageUrl?: string
}

export function BookCard({ book, contactEmail, contactPageUrl }: BookCardProps) {
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
  const canPurchase = !isOutOfStock && !isDiscontinued && !isUnpriced && book.stockQuantity > 0

  // Build contact link for unpriced/out-of-stock books
  const contactHref = contactPageUrl || (contactEmail ? `mailto:${contactEmail}` : '/contact')

  return (
    <Card className="card-hover-lift group flex h-full flex-col overflow-hidden">
      <Link href={`/shop/${book.slug ?? book.id}`} className="flex-1">
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          <BookCoverImage
            src={coverUrl}
            alt={book.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {(isOutOfStock || isDiscontinued) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Badge variant="destructive">{getStockStatusLabel(book.stockStatus)}</Badge>
            </div>
          )}
          {isLowStock && (
            <div className="absolute right-2 top-2">
              <Badge variant="warning">
                {getStockStatusLabel(book.stockStatus, book.stockQuantity)}
              </Badge>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3 className="font-heading line-clamp-2 font-semibold">{book.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
          {book.synopsis && (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{book.synopsis}</p>
          )}
        </CardContent>
      </Link>
      <CardFooter className="flex flex-col gap-3 p-4 pt-0">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col">
            {isUnpriced ? (
              <span className="text-lg font-semibold text-muted-foreground">Price on request</span>
            ) : (
              <>
                <span className="font-mono text-lg font-bold">
                  {formatPrice(book.sellPrice ?? 0, book.currency)}
                </span>
                {(book.memberPrice ?? 0) < (book.sellPrice ?? 0) && (
                  <span className="text-sm text-muted-foreground">
                    Member: {formatPrice(book.memberPrice ?? 0, book.currency)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        {canPurchase && (
          <AddToCartButton
            bookId={book.id}
            title={book.title}
            stockQuantity={book.stockQuantity}
            sellPrice={book.sellPrice}
            variant="outline"
            size="sm"
            className="w-full"
          />
        )}
        {(isUnpriced || isOutOfStock) && !isDiscontinued && (
          <a
            href={contactHref}
            className="w-full rounded-md border border-primary bg-transparent px-4 py-2 text-center text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {isUnpriced ? 'Contact for Pricing' : 'Contact Us'}
          </a>
        )}
      </CardFooter>
    </Card>
  )
}
