/**
 * Open Library API Integration
 *
 * Provides book lookup functionality using Open Library's Books API
 * Documentation: https://openlibrary.org/dev/docs/api/books
 */

import { cleanISBN, convertISBN10to13, validateISBN } from '../isbnUtils'
import type { BookLookupResult, BookData } from './types'
import { LRUCache } from './cache'
import { TIMEOUT } from './config'

/**
 * Open Library book data structure
 */
interface OpenLibraryBook {
  title: string
  subtitle?: string
  authors?: Array<{ name: string; url: string }>
  publishers?: Array<{ name: string }>
  publishDate?: string
  numberOfPages?: number
  subjects?: Array<string | { name: string }> // Can be strings or objects with name property
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
  description?: string | { value: string }
}

// Shared cache instance for Open Library API results
const cache = new LRUCache<BookLookupResult>()

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

  // Set up request timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.OPEN_LIBRARY)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Infoshop-Payload/1.0 (Bookstore Inventory System)',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const bookKey = `ISBN:${isbn13}`

    if (!data[bookKey]) {
      return null
    }

    return data[bookKey] as OpenLibraryBook
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      return null
    }
    return null
  }
}

/**
 * Transform Open Library data to our format
 */
function transformOpenLibraryData(olBook: OpenLibraryBook, isbn: string): BookData {
  // Extract author names
  const author =
    olBook.authors && olBook.authors.length > 0
      ? olBook.authors.map((a) => a.name).join(', ')
      : 'Unknown Author'

  // Extract publisher
  const publisher =
    olBook.publishers && olBook.publishers.length > 0 ? olBook.publishers[0].name : undefined

  // Extract cover image (prefer large, fallback to medium, then small)
  const coverImageUrl = olBook.cover?.large ?? olBook.cover?.medium ?? olBook.cover?.small

  // Extract OCLC number
  const oclcNumber =
    olBook.identifiers?.oclc && olBook.identifiers.oclc.length > 0
      ? olBook.identifiers.oclc[0]
      : undefined

  // Extract description (can be string or object with value)
  let synopsis: string | undefined
  if (typeof olBook.description === 'string') {
    synopsis = olBook.description
  } else if (
    olBook.description &&
    typeof olBook.description === 'object' &&
    'value' in olBook.description
  ) {
    synopsis = olBook.description.value
  }

  // Extract subjects (can be string array or object array with name property)
  let subjects: string[] | undefined
  if (olBook.subjects && Array.isArray(olBook.subjects)) {
    subjects = olBook.subjects
      .map((subject) => {
        // Handle both string and object formats
        if (typeof subject === 'string') {
          return subject
        } else if (subject && typeof subject === 'object' && 'name' in subject) {
          return (subject as { name: string }).name
        }
        return null
      })
      .filter((s): s is string => s !== null && s.trim().length > 0)
  }

  return {
    title: olBook.title,
    author,
    publisher,
    publishedDate: olBook.publishDate,
    synopsis,
    coverImageUrl,
    isbn: cleanISBN(isbn),
    oclcNumber,
    pages: olBook.numberOfPages,
    subjects,
  }
}

/**
 * Open Library Search API result document
 */
interface OpenLibrarySearchDoc {
  title: string
  author_name?: string[]
  publisher?: string[]
  first_publish_year?: number
  isbn?: string[]
  cover_i?: number
  number_of_pages_median?: number
  subject?: string[]
}

/**
 * Open Library Search API response
 */
interface OpenLibrarySearchResponse {
  numFound: number
  docs: OpenLibrarySearchDoc[]
}

/**
 * Transform an Open Library search doc into our standard BookData format
 *
 * The search API returns a different shape from the bibkeys/ISBN API,
 * so we need a separate transform function.
 */
function transformSearchResult(doc: OpenLibrarySearchDoc): BookData {
  const author = doc.author_name?.join(', ') ?? 'Unknown Author'
  const publisher = doc.publisher?.[0]

  let coverImageUrl: string | undefined
  if (doc.cover_i) {
    coverImageUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
  }

  const publishedDate = doc.first_publish_year ? String(doc.first_publish_year) : undefined

  const isbn = doc.isbn?.[0] ?? ''

  const subjects = doc.subject
    ?.filter((s) => s.trim().length > 0)
    .slice(0, 10)

  return {
    title: doc.title,
    author,
    publisher,
    publishedDate,
    coverImageUrl,
    isbn,
    pages: doc.number_of_pages_median,
    subjects,
  }
}

/**
 * Search Open Library by title and optional author
 *
 * Uses the Search API (different from the ISBN bibkeys API).
 *
 * @param title - Book title
 * @param author - Optional author name
 * @returns Array of BookData results (may be empty)
 */
export async function searchByTitle(title: string, author?: string): Promise<BookData[]> {
  const params = new URLSearchParams({
    title,
    limit: '3',
    fields: 'title,author_name,publisher,first_publish_year,isbn,cover_i,number_of_pages_median,subject',
  })
  if (author) params.set('author', author)

  const url = `https://openlibrary.org/search.json?${params}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT.OPEN_LIBRARY)

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Infoshop-Payload/1.0 (Bookstore Inventory System)' },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) return []

    const data: OpenLibrarySearchResponse = await response.json()

    if (data.numFound === 0 || data.docs.length === 0) return []

    return data.docs.map(transformSearchResult)
  } catch {
    clearTimeout(timeoutId)
    return []
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

  // Validate ISBN format
  const validation = validateISBN(cleaned)
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid ISBN format',
      source: 'openlibrary',
    }
  }

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
