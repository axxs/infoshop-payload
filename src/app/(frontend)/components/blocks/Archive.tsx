import React from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'
import type { Book, Event, Category, Subject } from '@/payload-types'
import type { Where } from 'payload'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { formatDate, formatPrice } from '@/lib/utils'
import { ScrollReveal } from '../cinematic/ScrollReveal'
import { StaggerReveal } from '../cinematic/StaggerReveal'

interface ArchiveProps {
  title?: string | null
  collection: 'books' | 'events'
  category?: number | Category | null
  subject?: number | Subject | null
  dateRange?: {
    start?: string | null
    end?: string | null
  } | null
  layout: 'grid' | 'list'
  enableSearch: boolean
  enableFilters: boolean
  itemsPerPage: number
}

async function getItems(props: ArchiveProps): Promise<Array<Book | Event>> {
  const payload = await getPayload({ config })

  const where: Where = {}

  if (props.collection === 'books') {
    if (props.category) {
      const categoryId = typeof props.category === 'number' ? props.category : props.category.id
      where.category = { equals: categoryId }
    }

    if (props.subject) {
      const subjectId = typeof props.subject === 'number' ? props.subject : props.subject.id
      where.subjects = { contains: subjectId }
    }
  }

  if (props.collection === 'events' && props.dateRange) {
    if (props.dateRange.start) {
      where.startDate = { greater_than_equal: props.dateRange.start }
    }
    if (props.dateRange.end) {
      where.startDate = { less_than_equal: props.dateRange.end }
    }
  }

  const result = await payload.find({
    collection: props.collection,
    where: Object.keys(where).length > 0 ? where : undefined,
    limit: props.itemsPerPage,
    sort: props.collection === 'events' ? 'startDate' : '-createdAt',
  })

  return result.docs as Array<Book | Event>
}

export async function Archive(props: ArchiveProps) {
  const items = await getItems(props)

  const gridClasses =
    props.layout === 'grid'
      ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
      : 'flex flex-col gap-4'

  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        {props.title && (
          <ScrollReveal className="mb-12 text-center">
            <h2 className="font-heading text-3xl font-bold">{props.title}</h2>
          </ScrollReveal>
        )}

        {items.length > 0 ? (
          <StaggerReveal className={gridClasses}>
            {items.map((item) => {
              if (props.collection === 'books') {
                const book = item as Book
                const coverImage =
                  book.coverImage && typeof book.coverImage === 'object' ? book.coverImage : null

                return (
                  <Link
                    key={book.id}
                    href={`/shop/${book.slug ?? book.id}`}
                    className="card-hover-lift group"
                  >
                    <Card>
                      {coverImage?.url && props.layout === 'grid' && (
                        <div className="relative aspect-[2/3] overflow-hidden">
                          <Image
                            src={coverImage.url}
                            alt={book.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="font-heading line-clamp-2">{book.title}</CardTitle>
                        {book.author && <CardDescription>{book.author}</CardDescription>}
                      </CardHeader>
                      {book.sellPrice && (
                        <CardContent>
                          <p className="font-mono font-semibold text-primary">
                            {formatPrice(book.sellPrice, book.currency)}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  </Link>
                )
              } else {
                const event = item as Event

                return (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="card-hover-lift group"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="font-heading line-clamp-2">{event.title}</CardTitle>
                        {event.startDate && (
                          <CardDescription>
                            {formatDate(new Date(event.startDate))}
                            {event.location && ` • ${event.location}`}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  </Link>
                )
              }
            })}
          </StaggerReveal>
        ) : (
          <p className="text-center text-muted-foreground">No items to display</p>
        )}
      </div>
    </section>
  )
}
