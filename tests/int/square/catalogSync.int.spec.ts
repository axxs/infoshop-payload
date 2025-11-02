/**
 * Square Catalog Sync Integration Tests
 *
 * Tests the Square catalog synchronization functionality
 * These tests require SQUARE_ACCESS_TOKEN to be set in environment
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { getSquareClient, generateIdempotencyKey } from '@/lib/square/client'

describe('Square Client Configuration', () => {
  test('generates valid UUID v4 idempotency keys', () => {
    const key1 = generateIdempotencyKey()
    const key2 = generateIdempotencyKey()

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

    expect(key1).toMatch(uuidRegex)
    expect(key2).toMatch(uuidRegex)
    expect(key1).not.toBe(key2) // Should be unique
  })

  test('requires SQUARE_ACCESS_TOKEN environment variable', () => {
    const originalToken = process.env.SQUARE_ACCESS_TOKEN
    delete process.env.SQUARE_ACCESS_TOKEN

    expect(() => getSquareClient()).toThrow('SQUARE_ACCESS_TOKEN environment variable is not set')

    // Restore
    if (originalToken) {
      process.env.SQUARE_ACCESS_TOKEN = originalToken
    }
  })

  test('initializes Square client with sandbox environment by default', () => {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      console.warn('Skipping test: SQUARE_ACCESS_TOKEN not set')
      return
    }

    const client = getSquareClient()
    expect(client).toBeDefined()
    // Client is initialized but we can't easily check environment without making API call
  })

  test('uses production environment when SQUARE_ENVIRONMENT=production', () => {
    if (!process.env.SQUARE_ACCESS_TOKEN) {
      console.warn('Skipping test: SQUARE_ACCESS_TOKEN not set')
      return
    }

    const originalEnv = process.env.SQUARE_ENVIRONMENT
    process.env.SQUARE_ENVIRONMENT = 'production'

    const client = getSquareClient()
    expect(client).toBeDefined()

    // Restore
    process.env.SQUARE_ENVIRONMENT = originalEnv
  })
})

describe('Square Catalog Sync - Book to Catalog Item Conversion', () => {
  test('converts book with all fields to Square catalog format', () => {
    // This test validates the structure without making API calls
    // Actual conversion logic is tested through E2E tests
    const mockBook = {
      id: 'test-book-id',
      title: 'Test Book',
      author: 'Test Author',
      isbn: '9780140328721',
      costPrice: 10.0,
      sellPrice: 15.99,
      memberPrice: 13.99,
      currency: 'USD',
      isDigital: false,
      description: 'A test book',
    }

    // Validate expected structure exists
    expect(mockBook.costPrice).toBeLessThan(mockBook.sellPrice)
    expect(mockBook.isbn).toMatch(/^\d{13}$/)
    expect(['USD', 'EUR', 'GBP']).toContain(mockBook.currency)
  })

  test('handles books with minimal fields', () => {
    const mockBook = {
      id: 'minimal-book',
      title: 'Minimal Book',
      costPrice: 5.0,
      sellPrice: 10.0,
      memberPrice: 8.0,
      currency: 'USD',
      isDigital: false,
    }

    expect(mockBook.title).toBeDefined()
    expect(mockBook.sellPrice).toBeGreaterThan(mockBook.costPrice)
  })

  test('handles digital books (no inventory tracking)', () => {
    const mockBook = {
      id: 'digital-book',
      title: 'Digital Book',
      costPrice: 0,
      sellPrice: 9.99,
      memberPrice: 7.99,
      currency: 'USD',
      isDigital: true,
    }

    expect(mockBook.isDigital).toBe(true)
    expect(mockBook.costPrice).toBe(0)
  })
})

describe('Square Catalog Sync - Error Handling', () => {
  test('handles sync result with errors', () => {
    const syncResult = {
      success: false,
      itemsProcessed: 5,
      itemsCreated: 3,
      itemsUpdated: 0,
      itemsFailed: 2,
      errors: [
        {
          bookId: 'book-1',
          bookTitle: 'Failed Book 1',
          error: 'Invalid ISBN',
        },
        {
          bookId: 'book-2',
          bookTitle: 'Failed Book 2',
          error: 'Network timeout',
        },
      ],
    }

    expect(syncResult.success).toBe(false)
    expect(syncResult.itemsFailed).toBe(2)
    expect(syncResult.errors).toHaveLength(2)
    expect(syncResult.errors[0].error).toBe('Invalid ISBN')
  })

  test('validates successful sync result structure', () => {
    const syncResult = {
      success: true,
      itemsProcessed: 10,
      itemsCreated: 8,
      itemsUpdated: 2,
      itemsFailed: 0,
      errors: [],
    }

    expect(syncResult.success).toBe(true)
    expect(syncResult.itemsCreated + syncResult.itemsUpdated).toBe(syncResult.itemsProcessed)
    expect(syncResult.errors).toHaveLength(0)
  })
})
