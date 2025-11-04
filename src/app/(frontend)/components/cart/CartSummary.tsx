import Link from 'next/link'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card'
import { formatPrice } from '@/lib/utils'

interface CartSummaryProps {
  subtotal: number
  currency: string
  itemCount: number
}

export function CartSummary({ subtotal, currency, itemCount }: CartSummaryProps) {
  // Calculate estimated tax (10% GST for AUD, adjust as needed)
  const taxRate = currency === 'AUD' ? 0.1 : 0
  const tax = subtotal * taxRate
  const total = subtotal + tax

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({itemCount} items)</span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>

          {taxRate > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (GST {(taxRate * 100).toFixed(0)}%)</span>
              <span>{formatPrice(tax, currency)}</span>
            </div>
          )}

          <div className="border-t pt-2">
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPrice(total, currency)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3 text-sm">
          <p className="text-muted-foreground">
            Tax calculated at current rates. Final amount confirmed at checkout.
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full" size="lg">
          <Link href="/checkout">Proceed to Checkout</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
