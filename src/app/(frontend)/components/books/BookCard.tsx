import Link from 'next/link'
import { Book } from '@/payload-types'
import { Card, CardContent, CardFooter } from '../ui/card'
import { Badge } from '../ui/badge'
import { formatPrice, getStockStatusLabel } from '@/lib/utils'
import { BookCoverImage } from './BookCoverImage'

interface BookCardProps {
  book: Book
}

export function BookCard({ book }: BookCardProps) {
  const coverUrl =
    typeof book.coverImage === 'object' &&
    book.coverImage !== null &&
    'url' in book.coverImage &&
    book.coverImage.url
      ? book.coverImage.url
      : book.externalCoverUrl || '/placeholder-book.png'

  const isOutOfStock = book.stockStatus === 'OUT_OF_STOCK'
  const isDiscontinued = book.stockStatus === 'DISCONTINUED'
  const isLowStock = book.stockStatus === 'LOW_STOCK'

  return (
    <Link href={`/shop/${book.id}`}>
      <Card className="group h-full overflow-hidden transition-shadow hover:shadow-lg">
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
          <h3 className="line-clamp-2 font-semibold">{book.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-4 pt-0">
          <div className="flex flex-col">
            <span className="text-lg font-bold">{formatPrice(book.sellPrice, book.currency)}</span>
            {book.memberPrice < book.sellPrice && (
              <span className="text-sm text-muted-foreground">
                Member: {formatPrice(book.memberPrice, book.currency)}
              </span>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
