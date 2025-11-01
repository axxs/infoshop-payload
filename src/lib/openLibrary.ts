/**
 * Open Library API Integration
 *
 * Provides book lookup functionality using Open Library's Books API
 * Documentation: https://openlibrary.org/dev/docs/api/books
 */

import { cleanISBN, convertISBN10to13 } from './isbnUtils'

/**
 * Open Library book data structure
 */
export interface OpenLibraryBook {
  title: string
  subtitle?: string
  authors?: Array<{ name: string; url: string }>
  publishers?: Array<{ name: string }>
  publishDate?: string
  numberOfPages?: number
  subjects?: string[]
  cover?: {
    small?: string
    medium?: string
    large?: string
  }
  identifiers?: {
    isbn_10?: string[]
    isbn_13?: string[]
    oclc?: string[]
    lccn?: string[]
  }
  url?: string
  description?: string
}

/**
 * Book lookup result
 */
export interface BookLookupResult {
  success: boolean
  data?: {
    title: string
    author: string
    publisher?: string
    publishedDate?: string
    description?: string
    coverImageUrl?: string
    isbn: string
    oclcNumber?: string
    pages?: number
    subjects?: string[]
  }
  error?: string
  source: 'openlibrary'
}

/**
 * Simple in-memory cache with TTL
 */
class ISBNCache {
  private cache: Map<string, { data: BookLookupResult; timestamp: number }> = new Map()
  private ttl: number = 1000 * 60 * 60 * 24 // 24 hours

  set(isbn: string, data: BookLookupResult): void {
    this.cache.set(isbn, {
      data,
      timestamp: Date.now(),
    })
  }

  get(isbn: string): BookLookupResult | null {
    const cached = this.cache.get(isbn)
    if (!cached) return null

    // Check if expired
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(isbn)
      return null
    }

    return cached.data
  }

  clear(): void {
    this.cache.clear()
  }
}

const cache = new ISBNCache()

/**
 * Fetch book data from Open Library Books API
 */
async function fetchFromOpenLibrary(isbn: string): Promise<OpenLibraryBook | null> {
  const cleaned = cleanISBN(isbn)

  // Try ISBN-13 first (preferred), convert if ISBN-10
  let isbn13 = cleaned
  if (cleaned.length === 10) {
    isbn13 = convertISBN10to13(cleaned) || cleaned
  }

  // Use the Books API with jscmd=data format
  const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn13}&format=json&jscmd=data`

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Infoshop-Payload/1.0 (Bookstore Inventory System)',
      },
    })

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const bookKey = `ISBN:${isbn13}`

    if (!data[bookKey]) {
      return null
    }

    return data[bookKey] as OpenLibraryBook
  } catch (error) {
    throw new Error(
      `Failed to fetch from Open Library: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

/**
 * Transform Open Library data to our format
 */
function transformOpenLibraryData(olBook: OpenLibraryBook, isbn: string): BookLookupResult['data'] {
  // Extract author names
  const author =
    olBook.authors && olBook.authors.length > 0
      ? olBook.authors.map((a) => a.name).join(', ')
      : 'Unknown Author'

  // Extract publisher
  const publisher =
    olBook.publishers && olBook.publishers.length > 0 ? olBook.publishers[0].name : undefined

  // Extract cover image (prefer large, fallback to medium, then small)
  const coverImageUrl = olBook.cover?.large || olBook.cover?.medium || olBook.cover?.small

  // Extract OCLC number
  const oclcNumber =
    olBook.identifiers?.oclc && olBook.identifiers.oclc.length > 0
      ? olBook.identifiers.oclc[0]
      : undefined

  // Extract description (can be string or object with value)
  let description: string | undefined
  if (typeof olBook.description === 'string') {
    description = olBook.description
  } else if (
    olBook.description &&
    typeof olBook.description === 'object' &&
    'value' in olBook.description
  ) {
    description = (olBook.description as { value: string }).value
  }

  return {
    title: olBook.title,
    author,
    publisher,
    publishedDate: olBook.publishDate,
    description,
    coverImageUrl,
    isbn: cleanISBN(isbn),
    oclcNumber,
    pages: olBook.numberOfPages,
    subjects: olBook.subjects,
  }
}

/**
 * Look up book by ISBN
 *
 * @param isbn - ISBN-10 or ISBN-13 (with or without hyphens)
 * @returns Book data or error
 */
export async function lookupBookByISBN(isbn: string): Promise<BookLookupResult> {
  const cleaned = cleanISBN(isbn)

  // Check cache first
  const cached = cache.get(cleaned)
  if (cached) {
    return cached
  }

  try {
    const olBook = await fetchFromOpenLibrary(isbn)

    if (!olBook) {
      const result: BookLookupResult = {
        success: false,
        error: 'Book not found in Open Library',
        source: 'openlibrary',
      }
      cache.set(cleaned, result)
      return result
    }

    const result: BookLookupResult = {
      success: true,
      data: transformOpenLibraryData(olBook, isbn),
      source: 'openlibrary',
    }

    cache.set(cleaned, result)
    return result
  } catch (error) {
    const result: BookLookupResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'openlibrary',
    }
    return result
  }
}

/**
 * Clear the ISBN cache (useful for testing)
 */
export function clearISBNCache(): void {
  cache.clear()
}
