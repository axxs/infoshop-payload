'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import type { PopulatedCart } from '@/lib/cart'
import { processCheckout } from '@/lib/checkout/actions'
import { SquarePaymentForm } from '@/lib/square/SquarePaymentForm'
import { calculateTax } from '@/lib/tax/taxCalculation'

interface CheckoutFormProps {
  cart: PopulatedCart
}

export function CheckoutForm({ cart }: CheckoutFormProps) {
  const router = useRouter()
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')

  const taxCalculation = calculateTax(cart.subtotal, cart.currency)
  const total = taxCalculation.totalWithTax

  const handlePaymentSuccess = async (transactionId: string, receiptUrl?: string) => {
    setIsCreatingOrder(true)
    setError(null)

    try {
      const orderResult = await processCheckout({
        squareTransactionId: transactionId,
        squareReceiptUrl: receiptUrl,
        paymentMethod: 'CARD',
        customerEmail,
        customerName,
      })

      if (!orderResult.success) {
        setError(orderResult.error || 'Failed to create order')
        return
      }

      router.push(`/checkout/success?orderId=${orderResult.saleId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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

        {isCreatingOrder ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Creating your order...</span>
          </div>
        ) : (
          <SquarePaymentForm
            amount={total}
            currency={cart.currency as 'AUD' | 'USD' | 'EUR' | 'GBP'}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onCancel={handleCancel}
          />
        )}

        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
      </CardContent>
    </Card>
  )
}
