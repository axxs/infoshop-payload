/**
 * Unified Book Lookup with Multi-Source Fallback
 *
 * Implements a robust three-tier waterfall strategy:
 * 1. Google Books (excellent coverage, rich metadata)
 * 2. OpenLibrary (comprehensive, free, no auth)
 * 3. WorldCat (library cataloguing, basic data)
 *
 * Each source is tried in sequence until one succeeds.
 */

import * as GoogleBooks from './googleBooks'
import * as OpenLibrary from './openLibrary'
import * as WorldCat from './worldCat'
import type { BookLookupResult, BookData } from './types'

/**
 * Merge book data from multiple sources, preferring non-empty values
 *
 * @param primary - Primary source data
 * @param fallback - Fallback source data
 * @returns Merged data with best available values
 */
function mergeBookData(primary: BookData, fallback: BookData): BookData {
  return {
    title: primary.title ?? fallback.title,
    author: primary.author ?? fallback.author,
    publisher: primary.publisher ?? fallback.publisher,
    publishedDate: primary.publishedDate ?? fallback.publishedDate,
    synopsis: primary.synopsis ?? fallback.synopsis,
    coverImageUrl: primary.coverImageUrl ?? fallback.coverImageUrl,
    isbn: primary.isbn ?? fallback.isbn,
    oclcNumber: primary.oclcNumber ?? fallback.oclcNumber,
    pages: primary.pages ?? fallback.pages,
    subjects:
      primary.subjects && primary.subjects.length > 0
        ? primary.subjects
        : (fallback.subjects ?? primary.subjects),
  }
}

/**
 * Look up book by ISBN with intelligent multi-source fallback
 *
 * Strategy:
 * 1. Try Google Books (best metadata, excellent coverage)
 * 2. If fails, try OpenLibrary (comprehensive free source)
 * 3. If fails, try WorldCat (library standard, basic cataloguing data)
 * 4. If all fail, return consolidated error
 *
 * @param isbn - ISBN-10 or ISBN-13 (with or without hyphens)
 * @returns Book data from first successful source, or error if all fail
 */
export async function lookupBookByISBN(isbn: string): Promise<BookLookupResult> {
  const attemptedSources: string[] = []
  const errors: string[] = []

  // 1. Try Google Books (Primary)
  attemptedSources.push('Google Books')

  try {
    const gbResult = await GoogleBooks.lookupBookByISBN(isbn)

    if (gbResult.success && gbResult.data) {
      return {
        ...gbResult,
        attemptedSources,
        fallbackUsed: false,
      }
    }

    errors.push(`Google Books: ${gbResult.error || 'Not found'}`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`Google Books: ${errorMsg}`)
  }

  // 2. Try OpenLibrary (Secondary Fallback)
  attemptedSources.push('OpenLibrary')

  try {
    const olResult = await OpenLibrary.lookupBookByISBN(isbn)

    if (olResult.success && olResult.data) {
      return {
        ...olResult,
        attemptedSources,
        fallbackUsed: true,
      }
    }

    errors.push(`OpenLibrary: ${olResult.error || 'Not found'}`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`OpenLibrary: ${errorMsg}`)
  }

  // 3. Try WorldCat (Tertiary Fallback)
  attemptedSources.push('WorldCat')

  try {
    const wcResult = await WorldCat.lookupBookByISBN(isbn)

    if (wcResult.success && wcResult.data) {
      return {
        ...wcResult,
        attemptedSources,
        fallbackUsed: true,
      }
    }

    errors.push(`WorldCat: ${wcResult.error || 'Not found'}`)
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(`WorldCat: ${errorMsg}`)
  }

  // All sources failed
  return {
    success: false,
    error: `Book not found in any source. Tried: ${attemptedSources.join(', ')}. Errors: ${errors.join('; ')}`,
    source: 'googlebooks', // Default to first attempted
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
  const results = await Promise.allSettled([
    GoogleBooks.lookupBookByISBN(isbn),
    OpenLibrary.lookupBookByISBN(isbn),
    WorldCat.lookupBookByISBN(isbn),
  ])

  const attemptedSources = ['Google Books', 'OpenLibrary', 'WorldCat']
  const successfulResults: Array<{ source: string; data: BookData }> = []

  // Extract successful results
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success && result.value.data) {
      const sourceName = attemptedSources[index]
      successfulResults.push({
        source: sourceName,
        data: result.value.data,
      })
    }
  })

  if (successfulResults.length === 0) {
    return {
      success: false,
      error: 'Book not found in any source',
      source: 'googlebooks',
      attemptedSources,
      fallbackUsed: false,
    }
  }

  // Merge data from all successful sources
  let mergedData = successfulResults[0].data

  for (let i = 1; i < successfulResults.length; i++) {
    mergedData = mergeBookData(mergedData, successfulResults[i].data)
  }

  return {
    success: true,
    data: mergedData,
    source: 'googlebooks', // Primary source
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
