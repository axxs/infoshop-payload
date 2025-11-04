import Link from 'next/link'
import { BookOpen, Search, ShoppingCart } from 'lucide-react'
import { Button } from '../ui/button'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6" />
          <span className="text-xl font-bold">Infoshop</span>
        </Link>

        <nav className="ml-auto flex items-center space-x-6">
          <Link href="/shop" className="text-sm font-medium transition-colors hover:text-primary">
            Shop
          </Link>
          <Link
            href="/shop/categories"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Categories
          </Link>
          <Link
            href="/shop/subjects"
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Subjects
          </Link>
        </nav>

        <div className="ml-6 flex items-center space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/shop?search=">
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cart">
              <ShoppingCart className="h-5 w-5" />
              <span className="sr-only">Cart</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
