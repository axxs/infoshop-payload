/**
 * Subject Manager Integration Tests
 * Tests for finding, creating, and linking subjects
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  findOrCreateSubject,
  processSubjects,
  linkSubjectsToBook,
  processAndLinkSubjects,
} from '@/lib/openLibrary/subjectManager'

describe('Subject Manager', () => {
  let payload: Awaited<ReturnType<typeof getPayload>>

  // Track created IDs for robust cleanup
  const createdSubjectIds = new Set<number>()
  const createdBookIds = new Set<number>()

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterEach(async () => {
    // Clean up tracked books first (due to foreign key constraints)
    for (const id of createdBookIds) {
      try {
        await payload.delete({ collection: 'books', id })
      } catch {
        // Ignore errors if already deleted
      }
    }
    createdBookIds.clear()

    // Clean up tracked subjects
    for (const id of createdSubjectIds) {
      try {
        await payload.delete({ collection: 'subjects', id })
      } catch {
        // Ignore errors if already deleted
      }
    }
    createdSubjectIds.clear()

    // Fallback: Clean up any subjects with "Test Subject" in name
    try {
      const subjects = await payload.find({
        collection: 'subjects',
        where: {
          name: {
            contains: 'Test Subject',
          },
        },
        limit: 100,
      })

      for (const subject of subjects.docs) {
        try {
          await payload.delete({
            collection: 'subjects',
            id: subject.id,
          })
        } catch {
          // Ignore errors
        }
      }
    } catch {
      // Ignore errors in fallback cleanup
    }
  })

  describe('findOrCreateSubject', () => {
    it('should create a new subject if it does not exist', async () => {
      const result = await findOrCreateSubject(payload, 'Test Subject - New')
      createdSubjectIds.add(result.id)

      expect(result.created).toBe(true)
      expect(result.name).toBe('Test Subject - New')
      expect(result.slug).toBe('test-subject-new')
      expect(result.id).toBeGreaterThan(0)
    })

    it('should find existing subject by exact name match', async () => {
      // Create subject first
      const created = await findOrCreateSubject(payload, 'Test Subject - Existing')
      createdSubjectIds.add(created.id)
      expect(created.created).toBe(true)

      // Try to create again - should find existing
      const found = await findOrCreateSubject(payload, 'Test Subject - Existing')
      expect(found.created).toBe(false)
      expect(found.id).toBe(created.id)
      expect(found.name).toBe(created.name)
    })

    it('should find existing subject by case-insensitive match', async () => {
      // Create with specific casing
      const created = await findOrCreateSubject(payload, 'Test Subject - CaseSensitive')
      createdSubjectIds.add(created.id)

      // Try different casing - should find existing
      const found = await findOrCreateSubject(payload, 'test subject - casesensitive')
      expect(found.created).toBe(false)
      expect(found.id).toBe(created.id)
    })

    it('should reject empty subject names', async () => {
      await expect(findOrCreateSubject(payload, '')).rejects.toThrow('Subject name cannot be empty')
      await expect(findOrCreateSubject(payload, '   ')).rejects.toThrow(
        'Subject name cannot be empty',
      )
    })

    it('should generate correct slug from name', async () => {
      const result = await findOrCreateSubject(payload, 'Test Subject With Spaces & Symbols!')
      createdSubjectIds.add(result.id)
      expect(result.slug).toBe('test-subject-with-spaces-symbols')
    })
  })

  describe('processSubjects', () => {
    it('should process multiple subjects and return IDs', async () => {
      const subjectNames = ['Test Subject - A', 'Test Subject - B', 'Test Subject - C']

      const ids = await processSubjects(payload, subjectNames)
      ids.forEach((id) => createdSubjectIds.add(id))

      expect(ids).toHaveLength(3)
      expect(ids.every((id) => typeof id === 'number' && id > 0)).toBe(true)
    })

    it('should skip generic subjects when enabled', async () => {
      const subjectNames = [
        'Test Subject - Valid',
        'Fiction', // Generic
        'Test Subject - Another',
        'Literature', // Generic
      ]

      const ids = await processSubjects(payload, subjectNames, { skipGeneric: true })
      ids.forEach((id) => createdSubjectIds.add(id))

      expect(ids).toHaveLength(2)
    })

    it('should not skip generic subjects when disabled', async () => {
      const subjectNames = ['Fiction', 'Literature']

      const ids = await processSubjects(payload, subjectNames, { skipGeneric: false })
      ids.forEach((id) => createdSubjectIds.add(id))

      expect(ids).toHaveLength(2)
    })

    it('should limit number of subjects processed', async () => {
      const subjectNames = Array.from({ length: 20 }, (_, i) => `Test Subject - ${i}`)

      const ids = await processSubjects(payload, subjectNames, { maxSubjects: 5 })
      ids.forEach((id) => createdSubjectIds.add(id))

      expect(ids).toHaveLength(5)
    })

    it('should handle empty subject array', async () => {
      const ids = await processSubjects(payload, [])
      expect(ids).toHaveLength(0)
    })

    it('should filter out empty strings', async () => {
      const subjectNames = ['Test Subject - Valid', '', '   ', 'Test Subject - Another']

      const ids = await processSubjects(payload, subjectNames)
      ids.forEach((id) => createdSubjectIds.add(id))

      expect(ids).toHaveLength(2)
    })

    it('should handle duplicate subject names', async () => {
      const subjectNames = [
        'Test Subject - Duplicate',
        'Test Subject - Duplicate',
        'Test Subject - Unique',
      ]

      const ids = await processSubjects(payload, subjectNames)
      ids.forEach((id) => createdSubjectIds.add(id))

      // Should create only 2 subjects (duplicate is reused)
      expect(ids).toHaveLength(3)

      // First two IDs should be the same
      expect(ids[0]).toBe(ids[1])
      expect(ids[2]).not.toBe(ids[0])
    })
  })

  describe('linkSubjectsToBook', () => {
    it('should link subjects to a book', async () => {
      // Create test book
      const book = await payload.create({
        collection: 'books',
        draft: false,
        data: {
          title: 'Test Book for Subjects',
          author: 'Test Author',
          isbn: '9780140328721',
          costPrice: 10,
          sellPrice: 15,
          memberPrice: 12,
          stockQuantity: 5,
          currency: 'USD',
          stockStatus: 'IN_STOCK',
        },
      })
      createdBookIds.add(book.id)

      // Create subjects
      const subject1 = await findOrCreateSubject(payload, 'Test Subject - Link A')
      createdSubjectIds.add(subject1.id)
      const subject2 = await findOrCreateSubject(payload, 'Test Subject - Link B')
      createdSubjectIds.add(subject2.id)

      // Link subjects to book
      await linkSubjectsToBook(payload, book.id, [subject1.id, subject2.id])

      // Verify book has subjects
      const updatedBook = await payload.findByID({
        collection: 'books',
        id: book.id,
      })

      expect(updatedBook.subjects).toHaveLength(2)

      // Extract IDs from relationship objects
      const subjectIds = Array.isArray(updatedBook.subjects)
        ? updatedBook.subjects.map((s) =>
            typeof s === 'object' && s !== null && 'id' in s ? s.id : s,
          )
        : []

      expect(subjectIds).toContain(subject1.id)
      expect(subjectIds).toContain(subject2.id)
    })

    it('should handle empty subject array gracefully', async () => {
      const book = await payload.create({
        collection: 'books',
        draft: false,
        data: {
          title: 'Test Book for Empty Subjects',
          author: 'Test Author',
          isbn: '9780000000002',
          costPrice: 10,
          sellPrice: 15,
          memberPrice: 12,
          stockQuantity: 5,
          currency: 'USD',
          stockStatus: 'IN_STOCK',
        },
      })
      createdBookIds.add(book.id)

      // Should not throw error
      await linkSubjectsToBook(payload, book.id, [])
    })
  })

  describe('processAndLinkSubjects', () => {
    it('should complete full workflow: create subjects and link to book', async () => {
      // Create test book
      const book = await payload.create({
        collection: 'books',
        draft: false,
        data: {
          title: 'Test Book for Full Workflow',
          author: 'Test Author',
          isbn: '9780000000003',
          costPrice: 10,
          sellPrice: 15,
          memberPrice: 12,
          stockQuantity: 5,
          currency: 'USD',
          stockStatus: 'IN_STOCK',
        },
      })
      createdBookIds.add(book.id)

      const subjectNames = [
        'Test Subject - Workflow A',
        'Test Subject - Workflow B',
        'Fiction', // Should be filtered out
      ]

      const count = await processAndLinkSubjects(payload, book.id, subjectNames)

      expect(count).toBe(2) // Only 2 subjects (Fiction filtered)

      // Verify book has subjects
      const updatedBook = await payload.findByID({
        collection: 'books',
        id: book.id,
      })

      expect(updatedBook.subjects).toHaveLength(2)

      // Track created subjects for cleanup
      if (Array.isArray(updatedBook.subjects)) {
        updatedBook.subjects.forEach((s) => {
          const id = typeof s === 'object' && s !== null && 'id' in s ? s.id : s
          if (typeof id === 'number') {
            createdSubjectIds.add(id)
          }
        })
      }
    })
  })
})
