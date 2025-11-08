import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BookOpen, Search, ShoppingCart } from 'lucide-react'
import { Button } from '../ui/button'
import type { Media } from '@/payload-types'
import { NavigationDropdown } from './NavigationDropdown'

/**
 * Dynamic Header component that fetches navigation from Layout Global
 * Server Component - fetches data on each render
 */
export async function HeaderDynamic() {
  const payload = await getPayload({ config })

  let layout
  try {
    layout = await payload.findGlobal({
      slug: 'layout',
    })
  } catch (_error) {
    // Fallback if Layout Global doesn't exist
    return <HeaderFallback />
  }

  const navigation = layout.navigation || []
  const ctaButton = layout.ctaButton
  const logo = layout.logo && typeof layout.logo === 'object' ? (layout.logo as Media) : null

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          {logo?.url ? (
            <Image
              src={logo.url}
              alt="Infoshop"
              width={logo.width || 120}
              height={logo.height || 32}
              className="h-8 w-auto"
            />
          ) : (
            <>
              <BookOpen className="h-6 w-6" />
              <span className="text-xl font-bold">Infoshop</span>
            </>
          )}
        </Link>

        {/* Main Navigation */}
        <nav className="ml-auto flex items-center space-x-6">
          {navigation.map((item, index) => {
            // If item has children, render dropdown
            if (item.children && item.children.length > 0) {
              return (
                <NavigationDropdown
                  key={item.id || `nav-${index}`}
                  label={item.label}
                  href={item.href || '#'}
                  items={item.children}
                />
              )
            }

            // Otherwise render simple link
            return (
              <Link
                key={item.id || `nav-${index}`}
                href={item.href || '#'}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Action Buttons */}
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

/**
 * Fallback Header when Layout Global is not configured
 */
function HeaderFallback() {
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
