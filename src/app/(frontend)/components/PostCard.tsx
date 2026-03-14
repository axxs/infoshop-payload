import Link from 'next/link'
import Image from 'next/image'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { formatDate } from '@/lib/dates'

interface PostCardProps {
  title: string
  slug: string
  excerpt?: string | null
  publishedDate?: string | null
  featuredImage?: {
    url?: string | null
    alt?: string | null
    width?: number | null
    height?: number | null
  } | null
  categories?: { name: string }[]
}

export function PostCard({
  title,
  slug,
  excerpt,
  publishedDate,
  featuredImage,
  categories,
}: PostCardProps) {
  const imageUrl = featuredImage?.url
  const formattedDate = publishedDate ? formatDate(publishedDate) : null

  return (
    <Link href={`/news/${slug}`} className="group block">
      <Card className="overflow-hidden transition-shadow hover:shadow-lg">
        {imageUrl && (
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src={imageUrl}
              alt={featuredImage?.alt || title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}
        <CardContent className="p-6">
          {formattedDate && (
            <p className="mb-2 text-sm text-muted-foreground">{formattedDate}</p>
          )}
          <h3 className="mb-2 font-heading text-xl font-semibold group-hover:text-primary">
            {title}
          </h3>
          {excerpt && (
            <p className="line-clamp-3 text-sm text-muted-foreground">{excerpt}</p>
          )}
          {categories && categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Badge key={cat.name} variant="secondary">
                  {cat.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
