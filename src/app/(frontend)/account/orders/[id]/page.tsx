import { redirect, notFound } from 'next/navigation'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { ArrowLeft, Package, Clock, CheckCircle, XCircle } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Separator } from '../../../components/ui/separator'
import { getOrderById } from '@/lib/orders'
import { CancelOrderButton } from './CancelOrderButton'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Get status badge variant and icon
 */
function getStatusDisplay(status: string): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: React.ReactNode
  label: string
} {
  switch (status) {
    case 'COMPLETED':
      return {
        variant: 'default',
        icon: <CheckCircle className="h-4 w-4" />,
        label: 'Completed',
      }
    case 'PROCESSING':
      return {
        variant: 'secondary',
        icon: <Clock className="h-4 w-4" />,
        label: 'Processing',
      }
    case 'PENDING':
      return {
        variant: 'outline',
        icon: <Clock className="h-4 w-4" />,
        label: 'Pending',
      }
    case 'CANCELLED':
      return {
        variant: 'destructive',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Cancelled',
      }
    case 'REFUNDED':
      return {
        variant: 'destructive',
        icon: <XCircle className="h-4 w-4" />,
        label: 'Refunded',
      }
    default:
      return {
        variant: 'outline',
        icon: <Package className="h-4 w-4" />,
        label: status,
      }
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

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const saleId = parseInt(id, 10)

  if (isNaN(saleId)) {
    notFound()
  }

  const payload = await getPayload({ config })
  const headersList = await getHeaders()

  // Get current user
  const { user } = await payload.auth({ headers: headersList as Headers })

  if (!user) {
    redirect('/login?redirect=/account/orders')
  }

  // Fetch order
  const orderResult = await getOrderById(saleId)

  if (!orderResult.success || !orderResult.order) {
    notFound()
  }

  const order = orderResult.order

  // Verify this order belongs to the current user
  const orderCustomerId = typeof order.customer === 'object' ? order.customer?.id : order.customer
  if (orderCustomerId !== user.id && order.customerEmail !== user.email) {
    notFound()
  }

  const statusDisplay = getStatusDisplay(order.status)

  // Calculate if order can be cancelled (only PENDING or PROCESSING)
  const canCancel = order.status === 'PENDING' || order.status === 'PROCESSING'

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/account/orders"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Orders
      </Link>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Order #{order.receiptNumber || order.id}</h1>
            <p className="mt-2 text-muted-foreground">{formatDate(order.saleDate)}</p>
          </div>
          <Badge variant={statusDisplay.variant} className="flex items-center gap-2">
            {statusDisplay.icon}
            {statusDisplay.label}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.isArray(order.items) &&
                  order.items.map((item) => {
                    if (typeof item !== 'object' || !('book' in item)) return null

                    const book = item.book
                    if (typeof book !== 'object' || !('title' in book)) return null

                    return (
                      <div key={item.id} className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{book.title as string}</h4>
                          {book.author && (
                            <p className="text-sm text-muted-foreground">
                              by {book.author as string}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-muted-foreground">
                            Quantity: {item.quantity} × {formatPrice(item.unitPrice, 'AUD')}
                            {item.priceType === 'MEMBER' && (
                              <Badge variant="secondary" className="ml-2">
                                Member Price
                              </Badge>
                            )}
                          </p>
                        </div>
                        <div className="text-right font-medium">
                          {formatPrice(item.lineTotal, 'AUD')}
                        </div>
                      </div>
                    )
                  })}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.totalAmount, 'AUD')}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatPrice(order.totalAmount, 'AUD')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          {order.statusHistory &&
            Array.isArray(order.statusHistory) &&
            order.statusHistory.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Order Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {order.statusHistory.map((entry, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            {index + 1}
                          </div>
                          {order.statusHistory &&
                            Array.isArray(order.statusHistory) &&
                            index < order.statusHistory.length - 1 && (
                              <div className="h-full w-0.5 flex-1 bg-border" />
                            )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusDisplay(entry.status).variant}>
                              {entry.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(entry.timestamp)}
                            </span>
                          </div>
                          {entry.note && <p className="mt-1 text-sm">{entry.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="space-y-6">
          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium">{order.paymentMethod}</p>
              </div>
              {order.squareTransactionId && (
                <div>
                  <p className="text-sm text-muted-foreground">Transaction ID</p>
                  <p className="font-mono text-sm">{order.squareTransactionId}</p>
                </div>
              )}
              {order.squareReceiptUrl && (
                <div>
                  <a
                    href={order.squareReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View Square Receipt
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.customerName && (
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{order.customerName}</p>
                </div>
              )}
              {order.customerEmail && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{order.customerEmail}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {canCancel && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Manage your order</CardDescription>
              </CardHeader>
              <CardContent>
                <CancelOrderButton orderId={order.id} />
              </CardContent>
            </Card>
          )}

          {/* Cancellation Info */}
          {order.status === 'CANCELLED' && (
            <Card>
              <CardHeader>
                <CardTitle>Cancellation Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.cancelledAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Cancelled On</p>
                    <p className="font-medium">{formatDate(order.cancelledAt)}</p>
                  </div>
                )}
                {order.cancellationReason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{order.cancellationReason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
