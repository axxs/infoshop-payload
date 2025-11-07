'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { SquarePaymentForm } from '@/lib/square/SquarePaymentForm'
import type { PopulatedCart } from '@/lib/cart'

interface CheckoutFormProps {
  cart: PopulatedCart
  applicationId: string
  locationId: string
}

export function CheckoutForm({
  cart,
  applicationId: _applicationId,
  locationId: _locationId,
}: CheckoutFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')

  // Calculate total with tax
  const taxRate = cart.currency === 'AUD' ? 0.1 : 0
  const tax = cart.subtotal * taxRate
  const total = cart.subtotal + tax

  const handlePaymentSuccess = async (transactionId: string, receiptUrl?: string) => {
    try {
      // Create order via API
      const orderResponse = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squareTransactionId: transactionId,
          squareReceiptUrl: receiptUrl || '#',
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
    }
  }

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleCancel = () => {
    router.push('/cart')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer Information */}
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

        {/* Error Display */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        {/* Square Payment Form */}
        <SquarePaymentForm
          amount={total}
          currency={cart.currency as 'AUD' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'NZD'}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onCancel={handleCancel}
        />
      </CardContent>
    </Card>
  )
}
