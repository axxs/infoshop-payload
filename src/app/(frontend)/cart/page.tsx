import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, BookOpen, ShoppingCart } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { CartItem } from '../components/cart/CartItem'
import { CartSummary } from '../components/cart/CartSummary'
import { getCart } from '@/lib/cart'
import { ScrollReveal } from '../components/cinematic/ScrollReveal'
import { getPayload } from 'payload'
import config from '@payload-config'

export const metadata: Metadata = {
  title: 'Cart',
}

export default async function CartPage() {
  const payload = await getPayload({ config })
  const theme = (await payload.findGlobal({ slug: 'theme' })) as {
    orderingEnabled?: boolean
  }
  const orderingEnabled = theme?.orderingEnabled ?? true

  // Catalogue mode — ordering is disabled
  if (!orderingEnabled) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Browse Our Catalogue</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6 text-muted-foreground">
                Online ordering is not currently available. Visit us in store or get in touch to purchase books.
              </p>
              <div className="flex flex-col gap-3">
                <Button asChild>
                  <Link href="/shop">Browse Books</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const result = await getCart()

  if (!result.success) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-destructive">Error Loading Cart</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6 text-muted-foreground">{result.error}</p>
              <Button asChild>
                <Link href="/shop">Continue Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const { cart } = result

  // Empty cart state
  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Link
          href="/shop"
          className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Shop
        </Link>

        <div className="flex min-h-[60vh] items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">Your Cart is Empty</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-6 text-muted-foreground">
                Looks like you haven&apos;t added anything to your cart yet.
              </p>
              <Button asChild>
                <Link href="/shop">Start Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Cart with items
  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/shop"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Shop
      </Link>

      <ScrollReveal>
        <h1 className="mb-8 font-heading text-3xl font-bold">Shopping Cart</h1>
      </ScrollReveal>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{cart.itemCount} Items in Cart</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y px-6">
                {cart.items.map((item) => (
                  <CartItem key={item.bookId} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <CartSummary
              subtotal={cart.subtotal}
              currency={cart.currency}
              itemCount={cart.itemCount}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
