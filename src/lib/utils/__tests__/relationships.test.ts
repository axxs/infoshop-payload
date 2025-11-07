/**
 * Tests for relationship utilities
 */

import { describe, it, expect } from 'vitest'
import { getRelationshipId } from '../relationships'

describe('getRelationshipId', () => {
  describe('valid inputs', () => {
    it('handles number ID (SQLite/Postgres)', () => {
      const result = getRelationshipId(42, 'book')
      expect(result).toBe(42)
    })

    it('handles string ID (MongoDB)', () => {
      const result = getRelationshipId('507f1f77bcf86cd799439011', 'book')
      expect(result).toBe('507f1f77bcf86cd799439011')
    })

    it('handles populated relationship with number id', () => {
      const book = { id: 42, title: 'Test Book', author: 'Test Author' }
      const result = getRelationshipId(book, 'book')
      expect(result).toBe(42)
    })

    it('handles populated relationship with string id', () => {
      const book = { id: '507f1f77bcf86cd799439011', title: 'Test Book' }
      const result = getRelationshipId(book, 'book')
      expect(result).toBe('507f1f77bcf86cd799439011')
    })
  })

  describe('invalid inputs', () => {
    it('throws error for null', () => {
      expect(() => getRelationshipId(null, 'book')).toThrow('book is required but was null')
    })

    it('throws error for undefined', () => {
      expect(() => getRelationshipId(undefined, 'book')).toThrow(
        'book is required but was undefined',
      )
    })

    it('throws error for object without id property', () => {
      const invalidObject = { title: 'Test Book' }
      expect(() => getRelationshipId(invalidObject as any, 'book')).toThrow(
        'book has invalid format',
      )
    })

    it('throws error for object with invalid id type', () => {
      const invalidObject = { id: true }
      expect(() => getRelationshipId(invalidObject as any, 'book')).toThrow(
        'book object has invalid id type: boolean',
      )
    })

    it('throws error for boolean', () => {
      expect(() => getRelationshipId(true as any, 'book')).toThrow('book has invalid format')
    })

    it('throws error for array', () => {
      expect(() => getRelationshipId([1, 2, 3] as any, 'book')).toThrow('book has invalid format')
    })
  })

  describe('field name in error messages', () => {
    it('uses custom field name in error message', () => {
      expect(() => getRelationshipId(null, 'customer')).toThrow('customer is required but was null')
    })

    it('uses default field name when not provided', () => {
      expect(() => getRelationshipId(null)).toThrow('relationship is required but was null')
    })
  })
})
