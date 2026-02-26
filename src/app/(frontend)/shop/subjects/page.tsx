export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getPayload } from 'payload'

export const metadata: Metadata = {
  title: 'Subjects',
  description: 'Browse books by subject',
}
import config from '@payload-config'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { ArrowLeft } from 'lucide-react'

export default async function SubjectsPage() {
  const payload = await getPayload({ config })

  const { docs: subjects } = await payload.find({
    collection: 'subjects',
    limit: 100,
    sort: 'name',
    depth: 0,
  })

  // Count books in each subject
  const subjectsWithCounts = await Promise.all(
    subjects.map(async (subject) => {
      const { totalDocs } = await payload.find({
        collection: 'books',
        where: {
          subjects: {
            contains: subject.id,
          },
          stockStatus: {
            not_in: ['OUT_OF_STOCK', 'DISCONTINUED'],
          },
        },
        limit: 0,
      })
      return { ...subject, bookCount: totalDocs }
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
        <h1 className="text-3xl font-bold">Browse by Subject</h1>
        <p className="mt-2 text-muted-foreground">Explore our collection by subject tags</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjectsWithCounts.map((subject) => (
          <Link key={subject.id} href={`/shop/subjects/${subject.slug}`}>
            <Card className="h-full transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {subject.name}
                  <Badge variant="secondary">{subject.bookCount}</Badge>
                </CardTitle>
                {subject.description && <CardDescription>{subject.description}</CardDescription>}
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {subjectsWithCounts.length === 0 && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-muted-foreground">No subjects found</p>
          </div>
        </div>
      )}
    </div>
  )
}
