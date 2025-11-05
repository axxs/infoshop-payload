import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'

interface SuccessPageProps {
  searchParams: Promise<{ orderId?: string }>
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const orderId = params.orderId

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Thank you for your purchase. Your order has been successfully processed.
            </p>

            {orderId && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-mono text-sm font-semibold">{orderId}</p>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              You will receive a confirmation email shortly with your order details.
            </p>

            <div className="flex flex-col gap-2 pt-4">
              {orderId && (
                <Button asChild>
                  <Link href={`/account/orders/${orderId}`}>View Order Details</Link>
                </Button>
              )}
              <Button asChild variant={orderId ? 'outline' : 'default'}>
                <Link href="/shop">Continue Shopping</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
