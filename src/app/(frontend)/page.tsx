import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { Button } from './components/ui/button'
import { Card, CardHeader, CardTitle } from './components/ui/card'
import { BookCard } from './components/books/BookCard'
import { ArrowRight, BookOpen, Grid3x3, Tag } from 'lucide-react'

export default async function HomePage() {
  const payload = await getPayload({ config })

  // Fetch newest books
  const { docs: newestBooks } = await payload.find({
    collection: 'books',
    where: {
      stockStatus: {
        not_in: ['OUT_OF_STOCK', 'DISCONTINUED'],
      },
    },
    limit: 8,
    sort: '-createdAt',
    depth: 2,
  })

  // Fetch featured categories (top 6 with most books)
  const { docs: allCategories } = await payload.find({
    collection: 'categories',
    limit: 100,
    sort: 'name',
    depth: 0,
  })

  /**
   * NOTE: Potential N+1 Query Pattern
   *
   * This creates 6 separate database queries to count books per category.
   * Current impact: Minimal (only 6 queries on homepage)
   *
   * Future Optimization Options:
   * 1. Add `bookCount` field to categories collection, updated via hooks
   * 2. Use aggregation query to fetch counts in single query
   * 3. Cache category counts with TTL
   *
   * Acceptable for now given:
   * - Only affects homepage (not repeated on every page)
   * - Small number of queries (6)
   * - Categories change infrequently
   *
   * See: CLAUDE.md - Performance & Security section
   */
  const categoriesWithCounts = await Promise.all(
    allCategories.slice(0, 6).map(async (category) => {
      const { totalDocs } = await payload.find({
        collection: 'books',
        where: {
          categories: {
            contains: category.id,
          },
          stockStatus: {
            not_in: ['OUT_OF_STOCK', 'DISCONTINUED'],
          },
        },
        limit: 0,
      })
      return { ...category, bookCount: totalDocs }
    }),
  )

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="border-b bg-gradient-to-b from-muted/50 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <BookOpen className="mx-auto mb-6 h-16 w-16 text-primary" />
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">
            Welcome to Infoshop
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Your community bookstore collective. Discover radical literature, independent
            publishing, and grassroots knowledge.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/shop">
                Browse All Books
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/shop/categories">
                <Grid3x3 className="mr-2 h-5 w-5" />
                Browse Categories
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Newest Arrivals */}
      <section className="border-b py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">New Arrivals</h2>
              <p className="mt-2 text-muted-foreground">Recently added to our collection</p>
            </div>
            <Button asChild variant="ghost">
              <Link href="/shop">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {newestBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Category */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold">Browse by Category</h2>
              <p className="mt-2 text-muted-foreground">Explore our curated collections</p>
            </div>
            <Button asChild variant="ghost">
              <Link href="/shop/categories">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {categoriesWithCounts.map((category) => (
              <Link key={category.id} href={`/shop/categories/${category.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{category.name}</span>
                      <span className="text-sm font-normal text-muted-foreground">
                        {category.bookCount} books
                      </span>
                    </CardTitle>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Subject CTA */}
      <section className="border-t bg-muted/50 py-16">
        <div className="container mx-auto px-4 text-center">
          <Tag className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="mb-4 text-3xl font-bold">Looking for something specific?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
            Browse our books by subject tags to find exactly what you need
          </p>
          <Button asChild size="lg" variant="outline">
            <Link href="/shop/subjects">
              Browse by Subject
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
