import { Book } from '@/payload-types'
import { BookCard } from './BookCard'
import { StaggerReveal } from '../cinematic/StaggerReveal'

interface BookGridProps {
  books: Book[]
  contactEmail?: string
  contactPageUrl?: string
}

export function BookGrid({ books, contactEmail, contactPageUrl }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">No books found</p>
          <p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      </div>
    )
  }

  return (
    <StaggerReveal
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
      stagger={0.05}
      distance={20}
    >
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          contactEmail={contactEmail}
          contactPageUrl={contactPageUrl}
        />
      ))}
    </StaggerReveal>
  )
}
