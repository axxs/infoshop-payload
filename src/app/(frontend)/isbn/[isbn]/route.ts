import { getPayload } from 'payload'
import config from '@payload-config'
import { notFound } from 'next/navigation'
import { NextResponse, type NextRequest } from 'next/server'
import { validateISBN } from '@/collections/Books/hooks'

/**
 * GET /isbn/:isbn
 *
 * Canonical ISBN redirect: resolves any ISBN to the book's slug-based URL.
 * Responds with a 301 permanent redirect to /shop/:slug.
 * Returns 404 if no book with that ISBN exists.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ isbn: string }> }) {
  const { isbn } = await params

  // Validate ISBN format before hitting the database (reuses the same
  // validator as the Books collection hook for consistent enforcement)
  if (!validateISBN(isbn)) {
    notFound()
  }

  // Normalise: strip hyphens/spaces so bare ISBNs and formatted ones both work
  const normalised = isbn.replace(/[-\s]/g, '')

  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'books',
    where: { isbn: { equals: normalised } },
    limit: 1,
    select: { slug: true, id: true },
  })

  if (docs.length === 0) {
    notFound()
  }

  const book = docs[0]
  const destination = `/shop/${book.slug ?? book.id}`

  return NextResponse.redirect(new URL(destination, req.url), 301)
}
