'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import type { PopulatedCart } from '@/lib/cart'

interface CheckoutFormProps {
  cart: PopulatedCart
  applicationId: string
  locationId: string
}

export function CheckoutForm({ cart, applicationId, locationId }: CheckoutFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Calculate total with tax
      const taxRate = cart.currency === 'AUD' ? 0.1 : 0
      const tax = cart.subtotal * taxRate
      const total = cart.subtotal + tax

      // TODO: Initialize Square Web Payments SDK and get payment token
      // For now, create a mock payment for development
      const mockPaymentResult = {
        success: true,
        transactionId: `mock-${Date.now()}`,
        receiptUrl: '#',
      }

      if (!mockPaymentResult.success) {
        setError('Payment failed. Please try again.')
        return
      }

      // Create order via API
      const orderResponse = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squareTransactionId: mockPaymentResult.transactionId,
          squareReceiptUrl: mockPaymentResult.receiptUrl,
          paymentMethod: 'CARD',
          customerEmail,
          customerName,
        }),
      })

      const orderResult = await orderResponse.json()

      if (!orderResult.success) {
        setError(orderResult.error || 'Failed to create order')
        return
      }

      // Redirect to success page
      router.push(`/checkout/success?orderId=${orderResult.saleId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Name
            </label>
            <Input
              id="name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="John Smith"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
              placeholder="john@example.com"
            />
          </div>

          {/* TODO: Add Square Web Payments SDK card input */}
          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Square Web Payments SDK integration coming soon.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              For development: Click &quot;Complete Order&quot; to create a test order.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
          )}

          <Button type="submit" disabled={isLoading} className="w-full" size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              'Complete Order'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
