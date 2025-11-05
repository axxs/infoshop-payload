'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, Loader2 } from 'lucide-react'
import { Button } from '../../../components/ui/button'
import { cancelOrder } from '@/lib/orders'

interface CancelOrderButtonProps {
  orderId: number
}

export function CancelOrderButton({ orderId }: CancelOrderButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [reason, setReason] = useState('')
  const router = useRouter()

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for cancellation')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await cancelOrder({
        saleId: orderId,
        reason: reason.trim(),
        restoreStock: true,
      })

      if (result.success) {
        router.refresh()
        setShowConfirm(false)
      } else {
        setError(result.error || 'Failed to cancel order')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel order')
    } finally {
      setIsLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <Button
        variant="destructive"
        onClick={() => setShowConfirm(true)}
        className="w-full"
        disabled={isLoading}
      >
        <XCircle className="mr-2 h-4 w-4" />
        Cancel Order
      </Button>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="reason" className="mb-2 block text-sm font-medium">
          Cancellation Reason
        </label>
        <textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Please tell us why you're cancelling this order..."
          rows={3}
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setShowConfirm(false)
            setReason('')
            setError(null)
          }}
          className="flex-1"
          disabled={isLoading}
        >
          Keep Order
        </Button>
        <Button
          variant="destructive"
          onClick={handleCancel}
          className="flex-1"
          disabled={isLoading || !reason.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cancelling...
            </>
          ) : (
            'Confirm Cancellation'
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Note: Your order will be cancelled and stock will be restored to inventory.
      </p>
    </div>
  )
}
