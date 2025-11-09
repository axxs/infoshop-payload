/**
 * Unified Book Lookup with Multi-Source Fallback
 *
 * Implements a robust three-tier waterfall strategy:
 * 1. OpenLibrary (comprehensive, free, no auth)
 * 2. Google Books (excellent coverage, optional API key)
 * 3. WorldCat (library cataloguing, basic data)
 *
 * Each source is tried in sequence until one succeeds.
 */

import * as OpenLibrary from './openLibrary'
import * as GoogleBooks from './googleBooks'
import * as WorldCat from './worldCat'

/**
 * Unified book lookup result
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
  source: 'openlibrary' | 'googlebooks' | 'worldcat'
  attemptedSources: string[]
  fallbackUsed: boolean
}

/**
 * Merge book data from multiple sources, preferring non-empty values
 *
 * @param primary - Primary source data
 * @param fallback - Fallback source data
 * @returns Merged data with best available values
 */
function mergeBookData(
  primary: BookLookupResult['data'],
  fallback: BookLookupResult['data'],
): BookLookupResult['data'] {
  if (!primary) return fallback
  if (!fallback) return primary

  return {
    title: primary.title || fallback.title,
    author: primary.author || fallback.author,
    publisher: primary.publisher || fallback.publisher,
    publishedDate: primary.publishedDate || fallback.publishedDate,
    description: primary.description || fallback.description,
    coverImageUrl: primary.coverImageUrl || fallback.coverImageUrl,
    isbn: primary.isbn || fallback.isbn,
    oclcNumber: primary.oclcNumber || fallback.oclcNumber,
    pages: primary.pages || fallback.pages,
    subjects:
      primary.subjects && primary.subjects.length > 0
        ? primary.subjects
        : fallback.subjects || primary.subjects,
  }
}

/**
 * Look up book by ISBN with intelligent multi-source fallback
 *
 * Strategy:
 * 1. Try OpenLibrary (best free source, comprehensive metadata)
 * 2. If fails, try Google Books (excellent coverage, richer data)
 * 3. If fails, try WorldCat (library standard, basic cataloguing data)
 * 4. If all fail, return consolidated error
 *
 * @param isbn - ISBN-10 or ISBN-13 (with or without hyphens)
 * @returns Book data from first successful source, or error if all fail
 */
export async function lookupBookByISBN(isbn: string): Promise<BookLookupResult> {
  const attemptedSources: string[] = []
  const errors: string[] = []

  // 1. Try OpenLibrary (Primary)
  console.log(`[Book Lookup] Attempting OpenLibrary for ISBN: ${isbn}`)
  attemptedSources.push('OpenLibrary')

  try {
    const olResult = await OpenLibrary.lookupBookByISBN(isbn)

    if (olResult.success && olResult.data) {
      console.log(`[Book Lookup] ✓ OpenLibrary found: ${olResult.data.title}`)
      return {
        ...olResult,
        source: 'openlibrary',
        attemptedSources,
        fallbackUsed: false,
      }
    }

    errors.push(`OpenLibrary: ${olResult.error || 'Not found'}`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`OpenLibrary: ${errorMsg}`)
    console.warn(`[Book Lookup] ✗ OpenLibrary failed:`, errorMsg)
  }

  // 2. Try Google Books (Secondary Fallback)
  console.log(`[Book Lookup] Falling back to Google Books for ISBN: ${isbn}`)
  attemptedSources.push('Google Books')

  try {
    const gbResult = await GoogleBooks.lookupBookByISBN(isbn)

    if (gbResult.success && gbResult.data) {
      console.log(`[Book Lookup] ✓ Google Books found: ${gbResult.data.title}`)
      return {
        ...gbResult,
        source: 'googlebooks',
        attemptedSources,
        fallbackUsed: true,
      }
    }

    errors.push(`Google Books: ${gbResult.error || 'Not found'}`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Google Books: ${errorMsg}`)
    console.warn(`[Book Lookup] ✗ Google Books failed:`, errorMsg)
  }

  // 3. Try WorldCat (Tertiary Fallback)
  console.log(`[Book Lookup] Falling back to WorldCat for ISBN: ${isbn}`)
  attemptedSources.push('WorldCat')

  try {
    const wcResult = await WorldCat.lookupBookByISBN(isbn)

    if (wcResult.success && wcResult.data) {
      console.log(`[Book Lookup] ✓ WorldCat found: ${wcResult.data.title}`)
      return {
        ...wcResult,
        source: 'worldcat',
        attemptedSources,
        fallbackUsed: true,
      }
    }

    errors.push(`WorldCat: ${wcResult.error || 'Not found'}`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`WorldCat: ${errorMsg}`)
    console.warn(`[Book Lookup] ✗ WorldCat failed:`, errorMsg)
  }

  // All sources failed
  console.error(`[Book Lookup] ✗ All sources failed for ISBN: ${isbn}`)
  console.error(`[Book Lookup] Errors: ${errors.join(' | ')}`)

  return {
    success: false,
    error: `Book not found in any source. Tried: ${attemptedSources.join(', ')}. Errors: ${errors.join('; ')}`,
    source: 'openlibrary', // Default to first attempted
    attemptedSources,
    fallbackUsed: false,
  }
}

/**
 * Look up book with data enrichment from multiple sources
 *
 * Unlike the standard lookup which stops at the first success,
 * this function queries all available sources and merges the data
 * to provide the most complete result possible.
 *
 * Useful when you need the richest possible metadata.
 *
 * @param isbn - ISBN-10 or ISBN-13
 * @returns Merged data from all successful sources
 */
export async function lookupBookByISBNEnriched(isbn: string): Promise<BookLookupResult> {
  console.log(`[Book Lookup - Enriched] Querying all sources for ISBN: ${isbn}`)

  const results = await Promise.allSettled([
    OpenLibrary.lookupBookByISBN(isbn),
    GoogleBooks.lookupBookByISBN(isbn),
    WorldCat.lookupBookByISBN(isbn),
  ])

  const attemptedSources = ['OpenLibrary', 'Google Books', 'WorldCat']
  const successfulResults: Array<{ source: string; data: BookLookupResult['data'] }> = []

  // Extract successful results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success && result.value.data) {
      const sourceName = attemptedSources[index]
      successfulResults.push({
        source: sourceName,
        data: result.value.data,
      })
      console.log(`[Book Lookup - Enriched] ✓ ${sourceName}: ${result.value.data.title}`)
    }
  })

  if (successfulResults.length === 0) {
    console.error(`[Book Lookup - Enriched] ✗ No sources found data for ISBN: ${isbn}`)
    return {
      success: false,
      error: 'Book not found in any source',
      source: 'openlibrary',
      attemptedSources,
      fallbackUsed: false,
    }
  }

  // Merge data from all successful sources
  let mergedData = successfulResults[0].data

  for (let i = 1; i < successfulResults.length; i++) {
    mergedData = mergeBookData(mergedData, successfulResults[i].data)
  }

  console.log(
    `[Book Lookup - Enriched] ✓ Merged data from ${successfulResults.length} source(s): ${mergedData?.title}`,
  )

  return {
    success: true,
    data: mergedData,
    source: 'openlibrary', // Primary source
    attemptedSources,
    fallbackUsed: successfulResults.length > 1,
  }
}

/**
 * Clear all caches (useful for testing)
 */
export function clearAllCaches(): void {
  OpenLibrary.clearISBNCache()
  GoogleBooks.clearCache()
  WorldCat.clearCache()
}
