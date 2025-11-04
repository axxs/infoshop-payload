'use client'

import { useState } from 'react'
import { Minus, Plus, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { updateQuantity, removeFromCart } from '@/lib/cart'

interface QuantitySelectorProps {
  bookId: number
  currentQuantity: number
  maxQuantity: number
  onUpdate?: () => void
}

export function QuantitySelector({
  bookId,
  currentQuantity,
  maxQuantity,
  onUpdate,
}: QuantitySelectorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpdateQuantity = async (newQuantity: number) => {
    setIsLoading(true)
    setError(null)

    try {
      if (newQuantity === 0) {
        // Remove item if quantity is 0
        const result = await removeFromCart(bookId)
        if (!result.success) {
          setError(result.error)
          return
        }
      } else {
        const result = await updateQuantity(bookId, newQuantity)
        if (!result.success) {
          setError(result.error)
          return
        }
      }

      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update quantity')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDecrement = () => {
    if (currentQuantity > 0) {
      handleUpdateQuantity(currentQuantity - 1)
    }
  }

  const handleIncrement = () => {
    if (currentQuantity < maxQuantity) {
      handleUpdateQuantity(currentQuantity + 1)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleDecrement}
          disabled={isLoading || currentQuantity <= 1}
          className="h-8 w-8"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Minus className="h-3 w-3" />}
        </Button>

        <span className="w-12 text-center text-sm font-medium">{currentQuantity}</span>

        <Button
          variant="outline"
          size="icon"
          onClick={handleIncrement}
          disabled={isLoading || currentQuantity >= maxQuantity}
          className="h-8 w-8"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
