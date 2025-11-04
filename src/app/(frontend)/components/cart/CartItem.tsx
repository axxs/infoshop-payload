'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { BookCoverImage } from '../books/BookCoverImage'
import { QuantitySelector } from './QuantitySelector'
import { removeFromCart } from '@/lib/cart'
import { formatPrice } from '@/lib/utils'
import type { PopulatedCartItem } from '@/lib/cart'

interface CartItemProps {
  item: PopulatedCartItem
  onUpdate?: () => void
}

export function CartItem({ item, onUpdate }: CartItemProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRemove = async () => {
    setIsRemoving(true)
    setError(null)

    try {
      const result = await removeFromCart(item.bookId)
      if (!result.success) {
        setError(result.error)
        return
      }

      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item')
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div className="flex gap-4 border-b py-4">
      {/* Book Cover */}
      <Link href={`/shop/${item.bookId}`} className="relative h-24 w-16 flex-shrink-0">
        <BookCoverImage
          src={item.book.externalCoverUrl || '/placeholder-book.png'}
          alt={item.book.title}
          fill
          className="rounded object-cover"
          sizes="64px"
        />
      </Link>

      {/* Book Details */}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <Link href={`/shop/${item.bookId}`} className="font-medium hover:underline">
              {item.book.title}
            </Link>
            {item.book.author && (
              <p className="text-sm text-muted-foreground">{item.book.author}</p>
            )}
            {item.book.isbn && (
              <p className="text-xs text-muted-foreground">ISBN: {item.book.isbn}</p>
            )}
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={isRemoving}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            aria-label="Remove from cart"
          >
            {isRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </Button>
        </div>

        {/* Price and Quantity */}
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <QuantitySelector
              bookId={item.bookId}
              currentQuantity={item.quantity}
              maxQuantity={Math.min(item.book.stockQuantity, 99)}
              onUpdate={onUpdate}
            />
            {item.isMemberPrice && (
              <Badge variant="secondary" className="w-fit text-xs">
                Member Price
              </Badge>
            )}
          </div>

          <div className="text-right">
            <p className="font-medium">{formatPrice(item.lineTotal, item.currency)}</p>
            {item.quantity > 1 && (
              <p className="text-xs text-muted-foreground">
                {formatPrice(item.priceAtAdd, item.currency)} each
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
