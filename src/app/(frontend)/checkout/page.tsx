import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Checkout',
}
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { CheckoutForm } from '../components/checkout/CheckoutForm'
import { getCart } from '@/lib/cart'
import { formatPrice } from '@/lib/utils'
import { ScrollReveal } from '../components/cinematic/ScrollReveal'

export default async function CheckoutPage() {
  const result = await getCart()

  if (!result.success) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { cart } = result

  // Redirect to cart if empty
  if (cart.items.length === 0) {
    redirect('/cart')
  }

  // Calculate totals
  const taxRate = cart.currency === 'AUD' ? 0.1 : 0
  const tax = cart.subtotal * taxRate
  const total = cart.subtotal + tax

  // Get Square credentials from environment
  const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || ''
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || ''

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/cart"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Cart
      </Link>

      <ScrollReveal>
        <h1 className="mb-8 font-heading text-3xl font-bold">Checkout</h1>
      </ScrollReveal>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <CheckoutForm cart={cart} applicationId={applicationId} locationId={locationId} />
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {cart.items.map((item) => (
                  <div key={item.bookId} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {item.book.title} × {item.quantity}
                    </span>
                    <span>{formatPrice(item.lineTotal, cart.currency)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(cart.subtotal, cart.currency)}</span>
                </div>

                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax (GST {(taxRate * 100).toFixed(0)}%)
                    </span>
                    <span>{formatPrice(tax, cart.currency)}</span>
                  </div>
                )}

                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(total, cart.currency)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
