'use client'

import { useState } from 'react'
import { ShoppingCart, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { addToCart } from '@/lib/cart'
import { useRouter } from 'next/navigation'

interface AddToCartButtonProps {
  bookId: number
  title: string
  stockQuantity: number
  isMemberPrice?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}

export function AddToCartButton({
  bookId,
  title,
  stockQuantity,
  isMemberPrice = false,
  variant = 'default',
  size = 'default',
  className,
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAddToCart = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await addToCart(bookId, 1, isMemberPrice)

      if (!result.success) {
        setError(result.error)
        return
      }

      // Success - redirect to cart or show success message
      router.push('/cart')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add to cart')
    } finally {
      setIsLoading(false)
    }
  }

  // Check if out of stock
  if (stockQuantity <= 0) {
    return (
      <Button variant="outline" disabled size={size} className={className}>
        Out of Stock
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleAddToCart}
        disabled={isLoading || stockQuantity <= 0}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : (
          <>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </>
        )}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {stockQuantity > 0 && stockQuantity <= 5 && !error && (
        <p className="text-sm text-orange-600">Only {stockQuantity} left in stock!</p>
      )}
    </div>
  )
}
