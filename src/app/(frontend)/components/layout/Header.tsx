import Link from 'next/link'
import { BookOpen, Search, ShoppingCart } from 'lucide-react'
import { Button } from '../ui/button'
import { getPayload } from 'payload'
import config from '@payload-config'
import { NavigationDropdown } from './NavigationDropdown'
import type { Layout } from '@/payload-types'
import { unstable_noStore } from 'next/cache'

async function getLayout(): Promise<Layout> {
  unstable_noStore() // Disable caching to ensure fresh data
  const payload = await getPayload({ config })
  return await payload.findGlobal({
    slug: 'layout',
    depth: 2, // Ensure nested fields like navigation.children are populated
  })
}

export async function Header() {
  const layout = await getLayout()
  const navigation = layout.navigation || []
  const ctaButton = layout.ctaButton

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6" />
          <span className="text-xl font-bold">Infoshop</span>
        </Link>

        <nav className="ml-auto flex items-center space-x-6">
          {navigation.map((item, index) => {
            // If item has children, render dropdown
            if (item.children && item.children.length > 0) {
              return (
                <NavigationDropdown
                  key={index}
                  label={item.label}
                  href={item.href}
                  items={item.children}
                />
              )
            }

            // Otherwise render simple link
            return (
              <Link
                key={index}
                href={item.href}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            )
          })}
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
          {ctaButton?.label && ctaButton?.href && (
            <Button asChild>
              <Link href={ctaButton.href}>{ctaButton.label}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
