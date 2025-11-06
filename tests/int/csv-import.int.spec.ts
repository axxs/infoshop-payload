/**
 * CSV Import Integration Tests
 * Tests CSV parsing, validation, and import functionality
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { getPayload } from 'payload'
import config from '@payload-config'
import { parseCSV, generateTemplate } from '@/lib/csv/parser'
import { validateBookOperation } from '@/lib/csv/validator'
import { detectAndHandleDuplicates } from '@/lib/csv/duplicateDetector'
import { previewCSVImport, executeCSVImport } from '@/lib/csv/importer'
import {
  BookOperationType,
  ValidationSeverity,
  ValidationCode,
  DuplicateStrategy,
} from '@/lib/csv/types'

describe('CSV Import', () => {
  let payload: Awaited<ReturnType<typeof getPayload>>

  const createdBookIds = new Set<number>()
  const createdSubjectIds = new Set<number>()
  const createdCategoryIds = new Set<number>()

  beforeAll(async () => {
    payload = await getPayload({ config })
  })

  afterEach(async () => {
    // Clean up in correct order (foreign key constraints)
    for (const id of createdBookIds) {
      try {
        await payload.delete({ collection: 'books', id })
      } catch {}
    }
    createdBookIds.clear()

    for (const id of createdSubjectIds) {
      try {
        await payload.delete({ collection: 'subjects', id })
      } catch {}
    }
    createdSubjectIds.clear()

    for (const id of createdCategoryIds) {
      try {
        await payload.delete({ collection: 'categories', id })
      } catch {}
    }
    createdCategoryIds.clear()
  })

  describe('CSV Parser', () => {
    it('should parse valid CSV with all fields', () => {
      const csv = `title,author,isbn,publisher,costPrice,sellPrice,memberPrice,currency,stockQuantity
The Conquest of Bread,Peter Kropotkin,9780521459907,Cambridge,10.00,15.00,12.00,USD,25`

      const operations = parseCSV(csv)

      expect(operations).toHaveLength(1)
      expect(operations[0].title).toBe('The Conquest of Bread')
      expect(operations[0].author).toBe('Peter Kropotkin')
      expect(operations[0].isbn).toBe('9780521459907')
      expect(operations[0].costPrice).toBe(10.0)
      expect(operations[0].sellPrice).toBe(15.0)
      expect(operations[0].memberPrice).toBe(12.0)
      expect(operations[0].stockQuantity).toBe(25)
    })

    it('should handle alternative column names', () => {
      const csv = `title,categoryName,subjectNames,oclcNumber
Test Book,Fiction,"Sci-Fi,Adventure",12345`

      const operations = parseCSV(csv)

      expect(operations[0].categoryName).toBe('Fiction')
      expect(operations[0].subjectNames).toEqual(['Sci-Fi', 'Adventure'])
      expect(operations[0].oclc).toBe('12345')
    })

    it('should parse boolean fields correctly', () => {
      const csv = `title,isDigital
Digital Book,true
Physical Book,false
Another Digital,yes`

      const operations = parseCSV(csv)

      expect(operations[0].isDigital).toBe(true)
      expect(operations[1].isDigital).toBe(false)
      expect(operations[2].isDigital).toBe(true)
    })

    it('should generate valid CSV template', () => {
      const template = generateTemplate()

      expect(template).toContain('title')
      expect(template).toContain('author')
      expect(template).toContain('isbn')
      expect(template).toContain('The Conquest of Bread')
    })
  })

  describe('Validator', () => {
    it('should require title field', () => {
      const operation = {
        operationType: BookOperationType.CREATE,
        rowIndex: 2,
        title: '',
      }

      const issues = validateBookOperation(operation)

      expect(issues).toHaveLength(1)
      expect(issues[0].severity).toBe(ValidationSeverity.ERROR)
      expect(issues[0].code).toBe(ValidationCode.REQUIRED_FIELD)
      expect(issues[0].field).toBe('title')
    })

    it('should validate complete pricing or none', () => {
      const operation = {
        operationType: BookOperationType.CREATE,
        rowIndex: 2,
        title: 'Test Book',
        costPrice: 10.0,
        // Missing sellPrice and memberPrice
      }

      const issues = validateBookOperation(operation)

      const pricingIssue = issues.find((i) => i.code === ValidationCode.INCOMPLETE_PRICING)
      expect(pricingIssue).toBeDefined()
      expect(pricingIssue?.severity).toBe(ValidationSeverity.ERROR)
    })

    it('should warn on negative margin', () => {
      const operation = {
        operationType: BookOperationType.CREATE,
        rowIndex: 2,
        title: 'Test Book',
        costPrice: 15.0,
        sellPrice: 10.0,
        memberPrice: 12.0,
      }

      const issues = validateBookOperation(operation)

      const marginIssue = issues.find((i) => i.code === ValidationCode.NEGATIVE_MARGIN)
      expect(marginIssue).toBeDefined()
      expect(marginIssue?.severity).toBe(ValidationSeverity.WARNING)
    })

    it('should error if member price below cost', () => {
      const operation = {
        operationType: BookOperationType.CREATE,
        rowIndex: 2,
        title: 'Test Book',
        costPrice: 15.0,
        sellPrice: 20.0,
        memberPrice: 10.0,
      }

      const issues = validateBookOperation(operation)

      const discountIssue = issues.find(
        (i) =>
          i.code === ValidationCode.INVALID_DISCOUNT && i.severity === ValidationSeverity.ERROR,
      )
      expect(discountIssue).toBeDefined()
    })

    it('should validate ISBN format', () => {
      const operation = {
        operationType: BookOperationType.CREATE,
        rowIndex: 2,
        title: 'Test Book',
        isbn: 'invalid-isbn',
      }

      const issues = validateBookOperation(operation)

      const isbnIssue = issues.find((i) => i.code === ValidationCode.INVALID_ISBN_LENGTH)
      expect(isbnIssue).toBeDefined()
      expect(isbnIssue?.severity).toBe(ValidationSeverity.WARNING)
    })

    it('should reject negative stock', () => {
      const operation = {
        operationType: BookOperationType.CREATE,
        rowIndex: 2,
        title: 'Test Book',
        stockQuantity: -5,
      }

      const issues = validateBookOperation(operation)

      const stockIssue = issues.find((i) => i.code === ValidationCode.INVALID_STOCK)
      expect(stockIssue).toBeDefined()
      expect(stockIssue?.severity).toBe(ValidationSeverity.ERROR)
    })

    it('should require download URL for digital products', () => {
      const operation = {
        operationType: BookOperationType.CREATE,
        rowIndex: 2,
        title: 'Digital Book',
        isDigital: true,
        // Missing downloadUrl
      }

      const issues = validateBookOperation(operation)

      const urlIssue = issues.find((i) => i.code === ValidationCode.MISSING_DOWNLOAD_URL)
      expect(urlIssue).toBeDefined()
      expect(urlIssue?.severity).toBe(ValidationSeverity.ERROR)
    })
  })

  describe('Duplicate Detection', () => {
    it('should detect duplicate by ISBN', async () => {
      // Create a book
      const book = await payload.create({
        collection: 'books',
        data: {
          title: 'Existing Book',
          author: 'Test Author',
          isbn: '9780140328721',
          costPrice: 10,
          sellPrice: 15,
          memberPrice: 12,
          currency: 'USD',
          stockQuantity: 10,
          stockStatus: 'IN_STOCK',
        },
        draft: false,
      })
      createdBookIds.add(book.id)

      const operations = [
        {
          operationType: BookOperationType.CREATE,
          rowIndex: 2,
          title: 'Duplicate Book',
          author: 'Test Author',
          isbn: '9780140328721',
        },
      ]

      const result = await detectAndHandleDuplicates(payload, operations, DuplicateStrategy.WARN)

      expect(result.operations[0].existingBookId).toBe(book.id)
      expect(result.issues).toHaveLength(1)
      expect(result.issues[0].code).toBe(ValidationCode.DUPLICATE_ISBN)
    })

    it('should detect duplicate by title and author', async () => {
      // Create a book without ISBN
      const book = await payload.create({
        collection: 'books',
        data: {
          title: 'Unique Title',
          author: 'Unique Author',
          costPrice: 10,
          sellPrice: 15,
          memberPrice: 12,
          currency: 'USD',
          stockQuantity: 10,
          stockStatus: 'IN_STOCK',
        },
        draft: false,
      })
      createdBookIds.add(book.id)

      const operations = [
        {
          operationType: BookOperationType.CREATE,
          rowIndex: 2,
          title: 'Unique Title',
          author: 'Unique Author',
        },
      ]

      const result = await detectAndHandleDuplicates(payload, operations, DuplicateStrategy.WARN)

      expect(result.operations[0].existingBookId).toBe(book.id)
      expect(result.issues[0].code).toBe(ValidationCode.DUPLICATE_TITLE_AUTHOR)
    })

    it('should apply SKIP strategy', async () => {
      const book = await payload.create({
        collection: 'books',
        data: {
          title: 'Book to Skip',
          author: 'Test Author',
          isbn: '9780140328721',
          costPrice: 10,
          sellPrice: 15,
          memberPrice: 12,
          currency: 'USD',
          stockQuantity: 10,
          stockStatus: 'IN_STOCK',
        },
        draft: false,
      })
      createdBookIds.add(book.id)

      const operations = [
        {
          operationType: BookOperationType.CREATE,
          rowIndex: 2,
          title: 'Duplicate',
          isbn: '9780140328721',
        },
      ]

      const result = await detectAndHandleDuplicates(payload, operations, DuplicateStrategy.SKIP)

      expect(result.operations[0].operationType).toBe(BookOperationType.SKIP)
    })

    it('should apply UPDATE strategy', async () => {
      const book = await payload.create({
        collection: 'books',
        data: {
          title: 'Book to Update',
          author: 'Test Author',
          isbn: '9780140328721',
          costPrice: 10,
          sellPrice: 15,
          memberPrice: 12,
          currency: 'USD',
          stockQuantity: 10,
          stockStatus: 'IN_STOCK',
        },
        draft: false,
      })
      createdBookIds.add(book.id)

      const operations = [
        {
          operationType: BookOperationType.CREATE,
          rowIndex: 2,
          title: 'Updated Title',
          isbn: '9780140328721',
        },
      ]

      const result = await detectAndHandleDuplicates(payload, operations, DuplicateStrategy.UPDATE)

      expect(result.operations[0].operationType).toBe(BookOperationType.UPDATE)
      expect(result.operations[0].existingBookId).toBe(book.id)
    })
  })

  describe('Preview Import', () => {
    it('should preview valid CSV', async () => {
      const csv = `title,author,costPrice,sellPrice,memberPrice,currency,stockQuantity
Good Book,Good Author,10,15,12,USD,25
Another Book,Another Author,8,12,10,USD,15`

      const result = await previewCSVImport(
        csv,
        {
          duplicateStrategy: DuplicateStrategy.WARN,
        },
        payload,
      )

      expect(result.totalOperations).toBe(2)
      expect(result.validOperations).toBe(2)
      expect(result.invalidOperations).toBe(0)
      expect(result.hasErrors).toBe(false)
      expect(result.operationsByType.create).toBe(2)
    })

    it('should identify validation errors', async () => {
      const csv = `title,author,costPrice,sellPrice,memberPrice
,Missing Title,10,15,12
Good Book,Good Author,10,5,12`

      const result = await previewCSVImport(csv, {}, payload)

      expect(result.invalidOperations).toBeGreaterThan(0)
      expect(result.hasErrors).toBe(true)
      expect(result.issues.some((i) => i.code === ValidationCode.REQUIRED_FIELD)).toBe(true)
    })
  })

  describe('Execute Import', () => {
    it('should import valid books', async () => {
      const csv = `title,author,costPrice,sellPrice,memberPrice,currency,stockQuantity
Import Test 1,Author 1,10,15,12,USD,25
Import Test 2,Author 2,8,12,10,USD,15`

      const preview = await previewCSVImport(
        csv,
        {
          duplicateStrategy: DuplicateStrategy.WARN,
          autoCreateCategories: false,
          autoCreateSubjects: false,
        },
        payload,
      )

      const result = await executeCSVImport(preview, {}, payload)

      expect(result.successful).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.createdBookIds).toHaveLength(2)

      // Track for cleanup
      result.createdBookIds.forEach((id) => createdBookIds.add(id))

      // Verify books were created
      const book1 = await payload.findByID({
        collection: 'books',
        id: result.createdBookIds[0],
      })
      expect(book1.title).toBe('Import Test 1')
    })

    it('should create categories and subjects', async () => {
      const csv = `title,author,costPrice,sellPrice,memberPrice,currency,categoryName,subjectNames
Cat Test,Test Author,10,15,12,USD,Test Category,"Subject A,Subject B"`

      const preview = await previewCSVImport(
        csv,
        {
          autoCreateCategories: true,
          autoCreateSubjects: true,
        },
        payload,
      )

      const result = await executeCSVImport(preview, {}, payload)

      expect(result.successful).toBe(1)
      result.createdBookIds.forEach((id) => createdBookIds.add(id))

      // Verify category was created
      const categories = await payload.find({
        collection: 'categories',
        where: {
          name: {
            equals: 'Test Category',
          },
        },
      })
      expect(categories.docs).toHaveLength(1)
      createdCategoryIds.add(categories.docs[0].id)

      // Verify subjects were created
      const subjects = await payload.find({
        collection: 'subjects',
        where: {
          name: {
            in: ['Subject A', 'Subject B'],
          },
        },
      })
      expect(subjects.docs.length).toBeGreaterThanOrEqual(2)
      subjects.docs.forEach((s) => createdSubjectIds.add(s.id))
    })

    it('should skip duplicates with SKIP strategy', async () => {
      // Create existing book
      const existing = await payload.create({
        collection: 'books',
        data: {
          title: 'Existing',
          author: 'Author',
          isbn: '9780140328721',
          costPrice: 10,
          sellPrice: 15,
          memberPrice: 12,
          currency: 'USD',
          stockQuantity: 10,
          stockStatus: 'IN_STOCK',
        },
        draft: false,
      })
      createdBookIds.add(existing.id)

      const csv = `title,author,isbn,costPrice,sellPrice,memberPrice,currency
Duplicate,Author,9780140328721,10,15,12,USD`

      const preview = await previewCSVImport(
        csv,
        {
          duplicateStrategy: DuplicateStrategy.SKIP,
        },
        payload,
      )

      const result = await executeCSVImport(preview, {}, payload)

      expect(result.skipped).toBe(1)
      expect(result.successful).toBe(0)
    })

    it('should update duplicates with UPDATE strategy', async () => {
      // Create existing book
      const existing = await payload.create({
        collection: 'books',
        data: {
          title: 'Original Title',
          author: 'Author',
          isbn: '9780140328721',
          costPrice: 10,
          sellPrice: 15,
          memberPrice: 12,
          currency: 'USD',
          stockQuantity: 10,
          stockStatus: 'IN_STOCK',
        },
        draft: false,
      })
      createdBookIds.add(existing.id)

      const csv = `title,author,isbn,costPrice,sellPrice,memberPrice,currency
Updated Title,Author,9780140328721,20,25,22,USD`

      const preview = await previewCSVImport(
        csv,
        {
          duplicateStrategy: DuplicateStrategy.UPDATE,
        },
        payload,
      )

      const result = await executeCSVImport(preview, {}, payload)

      expect(result.successful).toBe(1)
      expect(result.updatedBookIds).toHaveLength(1)

      // Verify book was updated
      const updated = await payload.findByID({
        collection: 'books',
        id: existing.id,
      })
      expect(updated.title).toBe('Updated Title')
      expect(updated.costPrice).toBe(20)
    })
  })
})
