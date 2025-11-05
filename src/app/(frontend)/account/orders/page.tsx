import { redirect } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { ArrowLeft, Package } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { getCustomerOrders } from '@/lib/orders'

/**
 * Get status badge variant based on order status
 */
function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'COMPLETED':
      return 'default'
    case 'PROCESSING':
      return 'secondary'
    case 'PENDING':
      return 'outline'
    case 'CANCELLED':
    case 'REFUNDED':
      return 'destructive'
    default:
      return 'outline'
  }
}

/**
 * Format currency for display
 */
function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: currency || 'AUD',
  }).format(amount)
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export default async function OrderHistoryPage() {
  const payload = await getPayload({ config })
  const headersList = await getHeaders()

  // Get current user from Payload auth
  const { user } = await payload.auth({ headers: headersList as Headers })

  if (!user) {
    redirect('/login?redirect=/account/orders')
  }

  // Fetch customer orders
  const ordersResult = await getCustomerOrders({
    customerId: user.id,
    limit: 50,
    page: 1,
  })

  const orders = ordersResult.orders || []

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/shop"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Shop
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Order History</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage your orders from Infoshop Bookstore
        </p>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[400px] flex-col items-center justify-center">
            <Package className="mb-4 h-16 w-16 text-muted-foreground" />
            <h3 className="mb-2 text-xl font-semibold">No orders yet</h3>
            <p className="mb-6 text-center text-muted-foreground">
              You haven&apos;t placed any orders yet. Start browsing our collection!
            </p>
            <Link href="/shop">
              <Button>Browse Books</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            // Count items
            const itemCount = Array.isArray(order.items) ? order.items.length : 0

            // Get first book title for preview
            let firstBookTitle = 'Items'
            if (
              Array.isArray(order.items) &&
              order.items.length > 0 &&
              typeof order.items[0] === 'object' &&
              'book' in order.items[0]
            ) {
              const book = order.items[0].book
              if (typeof book === 'object' && 'title' in book) {
                firstBookTitle = book.title as string
              }
            }

            return (
              <Link key={order.id} href={`/account/orders/${order.id}`}>
                <Card className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Order #{order.receiptNumber || order.id}
                          <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                        </CardTitle>
                        <CardDescription>{formatDate(order.saleDate)}</CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {formatPrice(order.totalAmount, 'AUD')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {firstBookTitle}
                          {itemCount > 1 && ` and ${itemCount - 1} more`}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
