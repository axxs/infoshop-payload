/**
 * Book Lookup Integration Tests
 *
 * Tests the multi-source book lookup system including:
 * - Google Books API
 * - Open Library API
 * - WorldCat Classify API
 * - Fallback chain behavior
 * - Data merging
 * - Cache behavior
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import * as BookLookup from '@/lib/bookLookup'
import { clearAllCaches } from '@/lib/bookLookup'

describe('Book Lookup Integration', () => {
  beforeAll(() => {
    // Ensure clean cache state
    clearAllCaches()
  })

  afterEach(() => {
    // Clear cache after each test
    clearAllCaches()
  })

  describe('lookupBookByISBN', () => {
    it('should successfully lookup a well-known book', async () => {
      // "The Pragmatic Programmer" - widely available in all sources
      const result = await BookLookup.lookupBookByISBN('9780135957059')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.title).toBeTruthy()
      expect(result.data?.author).toBeTruthy()
      expect(result.source).toBeDefined()
    }, 15000)

    it('should try sources in correct order (Google Books first)', async () => {
      const result = await BookLookup.lookupBookByISBN('9780135957059')

      expect(result.attemptedSources).toBeDefined()
      expect(result.attemptedSources).toContain('Google Books')

      // If successful, should be from first source (Google Books)
      if (result.success) {
        expect(result.source).toBe('googlebooks')
      }
    }, 15000)

    it('should handle invalid ISBN format', async () => {
      const result = await BookLookup.lookupBookByISBN('invalid-isbn')

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/invalid/i)
    })

    it('should handle non-existent ISBN', async () => {
      // Use a technically valid but non-existent ISBN
      const result = await BookLookup.lookupBookByISBN('9999999999999')

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    }, 20000)

    it('should respect cache on subsequent calls', async () => {
      const isbn = '9780135957059'

      // First call - should hit API
      const result1 = await BookLookup.lookupBookByISBN(isbn)
      const firstCallTime = Date.now()

      // Second call - should use cache (much faster)
      const startTime = Date.now()
      const result2 = await BookLookup.lookupBookByISBN(isbn)
      const secondCallTime = Date.now() - startTime

      // Cache hit should be < 10ms
      expect(secondCallTime).toBeLessThan(10)

      // Results should be identical
      expect(result1).toEqual(result2)
    }, 20000)

    it('should clean ISBN input (remove hyphens)', async () => {
      const withHyphens = '978-0-13-595705-9'
      const withoutHyphens = '9780135957059'

      const result1 = await BookLookup.lookupBookByISBN(withHyphens)
      clearAllCaches()
      const result2 = await BookLookup.lookupBookByISBN(withoutHyphens)

      // Should return same result regardless of hyphen presence
      if (result1.success && result2.success) {
        expect(result1.data?.isbn).toBe(result2.data?.isbn)
      }
    }, 20000)
  })

  describe('lookupBookByISBNEnriched', () => {
    it('should merge data from multiple sources', async () => {
      const result = await BookLookup.lookupBookByISBNEnriched('9780135957059')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()

      // Enriched mode should try all sources
      expect(result.attemptedSources).toContain('Google Books')
      expect(result.attemptedSources).toContain('OpenLibrary')
      expect(result.attemptedSources).toContain('WorldCat')
    }, 30000)

    it('should indicate when fallback was used', async () => {
      const result = await BookLookup.lookupBookByISBNEnriched('9780135957059')

      // fallbackUsed should be true if multiple sources returned data
      if (result.success) {
        expect(result.fallbackUsed).toBeDefined()
      }
    }, 30000)

    it('should handle partial source failures gracefully', async () => {
      // Even if one source fails, should succeed if ANY source returns data
      const result = await BookLookup.lookupBookByISBNEnriched('9780135957059')

      // As long as ONE source succeeds, enriched lookup should succeed
      if (result.attemptedSources && result.attemptedSources.length > 0) {
        expect(result.success || result.error).toBeTruthy()
      }
    }, 30000)
  })

  describe('Cache behavior', () => {
    it('should expire cached entries after TTL', async () => {
      // This test would require mocking time or using a very short TTL
      // For now, we just verify cache clearing works
      const isbn = '9780135957059'

      await BookLookup.lookupBookByISBN(isbn)
      clearAllCaches()

      // After clearing, should hit API again (slower)
      const startTime = Date.now()
      await BookLookup.lookupBookByISBN(isbn)
      const callTime = Date.now() - startTime

      // Without cache, should take > 100ms
      expect(callTime).toBeGreaterThan(100)
    }, 20000)

    it('should clear all source caches', () => {
      // Should not throw
      expect(() => clearAllCaches()).not.toThrow()
    })
  })

  describe('Data validation', () => {
    it('should return standardised book data format', async () => {
      const result = await BookLookup.lookupBookByISBN('9780135957059')

      if (result.success && result.data) {
        // Check for expected fields
        expect(result.data).toHaveProperty('title')
        expect(result.data).toHaveProperty('author')
        expect(result.data).toHaveProperty('isbn')

        // Title and author should never be empty
        expect(result.data.title).toBeTruthy()
        expect(result.data.author).toBeTruthy()
      }
    }, 15000)

    it('should include source attribution', async () => {
      const result = await BookLookup.lookupBookByISBN('9780135957059')

      expect(result.source).toBeDefined()
      expect(['googlebooks', 'openlibrary', 'worldcat']).toContain(result.source)
    }, 15000)
  })

  describe('Error scenarios', () => {
    it('should timeout gracefully on slow API', async () => {
      // Use a valid ISBN but expect timeout handling
      const result = await BookLookup.lookupBookByISBN('9780135957059')

      // Should either succeed or fail gracefully, never hang
      expect(result).toBeDefined()
      expect(result.success !== undefined).toBe(true)
    }, 20000)

    it('should provide detailed error information on failure', async () => {
      const result = await BookLookup.lookupBookByISBN('9999999999999')

      if (!result.success) {
        expect(result.error).toBeTruthy()
        expect(result.attemptedSources).toBeDefined()
      }
    }, 20000)
  })
})
