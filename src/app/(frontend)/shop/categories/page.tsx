import { getPayload } from 'payload'
import config from '@payload-config'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { ArrowLeft } from 'lucide-react'

export default async function CategoriesPage() {
  const payload = await getPayload({ config })

  const { docs: categories } = await payload.find({
    collection: 'categories',
    limit: 100,
    sort: 'name',
    depth: 0,
  })

  // Count books in each category
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
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
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/shop"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Shop
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Browse by Category</h1>
        <p className="mt-2 text-muted-foreground">Explore our collection by subject category</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categoriesWithCounts.map((category) => (
          <Link key={category.id} href={`/shop/categories/${category.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {category.name}
                  <Badge variant="secondary">{category.bookCount}</Badge>
                </CardTitle>
                {category.description && <CardDescription>{category.description}</CardDescription>}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {categoriesWithCounts.length === 0 && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">No categories found</p>
          </div>
        </div>
      )}
    </div>
  )
}
