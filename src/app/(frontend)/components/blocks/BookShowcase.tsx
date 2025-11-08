import React from 'react'
import { Button } from '../ui/button'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Book, Category, Subject } from '@/payload-types'
import type { Where } from 'payload'
import Link from 'next/link'
import Image from 'next/image'

interface BookShowcaseProps {
  title: string
  description?: string
  displayMode: 'newest' | 'featured' | 'category' | 'subject' | 'manual'
  category?: number | Category | null
  subject?: number | Subject | null
  manualBooks?: Array<number | Book> | null
  limit: number
  columns: '2' | '3' | '4'
  showViewAllLink: boolean
  viewAllHref?: string | null
}

async function getBooks(props: BookShowcaseProps): Promise<Book[]> {
  const payload = await getPayload({ config })

  // Manual selection
  if (props.displayMode === 'manual' && props.manualBooks) {
    const bookIds = props.manualBooks.map((b) => (typeof b === 'number' ? b : b.id)).filter(Boolean)

    if (bookIds.length === 0) return []

    const result = await payload.find({
      collection: 'books',
      where: {
        id: {
          in: bookIds,
        },
      },
      limit: bookIds.length,
    })

    return result.docs as Book[]
  }

  // Build query for other display modes
  const where: Where = {}

  if (props.displayMode === 'featured') {
    where.featured = { equals: true }
  }

  if (props.displayMode === 'category' && props.category) {
    const categoryId = typeof props.category === 'number' ? props.category : props.category.id
    where.category = { equals: categoryId }
  }

  if (props.displayMode === 'subject' && props.subject) {
    const subjectId = typeof props.subject === 'number' ? props.subject : props.subject.id
    where.subjects = { contains: subjectId }
  }

  const result = await payload.find({
    collection: 'books',
    where: Object.keys(where).length > 0 ? where : undefined,
    limit: props.limit,
    sort: '-createdAt',
  })

  return result.docs as Book[]
}

export async function BookShowcase(props: BookShowcaseProps) {
  const books = await getBooks(props)

  const gridCols = {
    '2': 'grid-cols-1 md:grid-cols-2',
    '3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    '4': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold">{props.title}</h2>
          {props.description && (
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">{props.description}</p>
          )}
        </div>

        {books.length > 0 ? (
          <>
            <div className={`grid gap-6 ${gridCols[props.columns]}`}>
              {books.map((book) => {
                const coverImage =
                  book.coverImage && typeof book.coverImage === 'object' ? book.coverImage : null

                return (
                  <Link
                    key={book.id}
                    href={`/books/${book.id}`}
                    className="group overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
                  >
                    {coverImage?.url && (
                      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
                        <Image
                          src={coverImage.url}
                          alt={book.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="mb-2 font-semibold line-clamp-2">{book.title}</h3>
                      {book.author && (
                        <p className="mb-2 text-sm text-muted-foreground">{book.author}</p>
                      )}
                      {book.sellPrice && (
                        <p className="font-semibold text-primary">
                          ${(book.sellPrice / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>

            {props.showViewAllLink && props.viewAllHref && (
              <div className="mt-12 text-center">
                <Button asChild size="lg">
                  <Link href={props.viewAllHref}>View All Books</Link>
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-muted-foreground">No books to display</p>
        )}
      </div>
    </section>
  )
}
