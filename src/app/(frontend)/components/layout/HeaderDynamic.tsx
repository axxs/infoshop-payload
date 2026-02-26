import Link from 'next/link'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@payload-config'
import { BookOpen, Search, ShoppingCart } from 'lucide-react'
import { Button } from '../ui/button'
import type { Media } from '@/payload-types'
import { NavigationDropdown } from './NavigationDropdown'
import { MorphingNavbar } from '../cinematic/MorphingNavbar'

export async function HeaderDynamic() {
  const payload = await getPayload({ config })

  let layout
  try {
    layout = await payload.findGlobal({
      slug: 'layout',
    })
  } catch {
    return <HeaderFallback />
  }

  const siteName = layout.siteName ?? 'Infoshop'
  const navigation = layout.navigation || []
  const ctaButton = layout.ctaButton
  const logo = layout.logo && typeof layout.logo === 'object' ? (layout.logo as Media) : null
  const logoDisplay =
    ((layout as unknown as Record<string, unknown>).logoDisplay as string) || 'logo-only'

  return (
    <MorphingNavbar>
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          {logo?.url ? (
            <>
              <Image
                src={logo.url}
                alt={siteName}
                width={logo.width || 120}
                height={logo.height || 32}
                className="h-8 w-auto"
              />
              {logoDisplay === 'logo-with-name' && (
                <span className="font-heading text-xl font-bold">{siteName}</span>
              )}
            </>
          ) : (
            <>
              <BookOpen className="h-6 w-6" />
              <span className="font-heading text-xl font-bold">{siteName}</span>
            </>
          )}
        </Link>

        {/* Main Navigation */}
        <nav className="ml-auto flex items-center space-x-6">
          {navigation.map((item, index) => {
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
    </MorphingNavbar>
  )
}

function HeaderFallback() {
  return (
    <MorphingNavbar>
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link href="/" className="flex items-center space-x-2">
          <BookOpen className="h-6 w-6" />
          <span className="font-heading text-xl font-bold">Infoshop</span>
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
    </MorphingNavbar>
  )
}
