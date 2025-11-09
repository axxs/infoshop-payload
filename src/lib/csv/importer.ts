/**
 * CSV Importer
 * Main orchestration for CSV import with preview and execution phases
 *
 * @module csv/importer
 */

import type { Payload } from 'payload'
import { parseCSV } from './parser'
import { validateBookOperation, isOperationValid } from './validator'
import { detectAndHandleDuplicates } from './duplicateDetector'
import { processAndLinkSubjects } from '../openLibrary/subjectManager'
import { downloadCoverImageIfPresent } from '../openLibrary/imageDownloader'
import { lookupBookByISBN } from '../bookLookup'
import { validateImageURL } from '../urlValidator'
import type { SupportedCurrency } from '../square/constants'
import type {
  BookOperation,
  BookOperationResult,
  CSVImportOptions,
  PreviewResult,
  ExecutionResult,
  ValidationIssue,
} from './types'
import { BookOperationType, ValidationSeverity, DuplicateStrategy } from './types'

/**
 * Default import options
 */
const DEFAULT_OPTIONS: Required<CSVImportOptions> = {
  duplicateStrategy: DuplicateStrategy.WARN,
  autoCreateCategories: true,
  autoCreateSubjects: true,
  autoPopulateFromISBN: true, // Enable by default for ISBN-only imports
  downloadCoverImages: true,
  defaultCurrency: 'USD',
  batchSize: 10,
  stopOnError: false,
}

/**
 * Enriches operation with data from multi-source ISBN lookup
 *
 * @param operation - Book operation with ISBN
 * @param payload - Payload instance for logging
 * @returns Enriched operation or original if lookup fails
 */
async function enrichFromISBN(operation: BookOperation, payload: Payload): Promise<BookOperation> {
  if (!operation.isbn) {
    return operation
  }

  try {
    const result = await lookupBookByISBN(operation.isbn)

    if (result.success && result.data) {
      payload.logger.info({
        msg: 'ISBN lookup successful',
        isbn: operation.isbn,
        title: result.data.title,
        source: result.source,
      })

      // Only populate fields that are missing
      return {
        ...operation,
        title: operation.title || result.data.title || operation.title,
        author: operation.author || result.data.author,
        publisher: operation.publisher || result.data.publisher,
        publishedDate: operation.publishedDate || result.data.publishedDate,
        synopsis: operation.synopsis || result.data.synopsis,
        coverImageUrl: operation.coverImageUrl || result.data.coverImageUrl,
        subjectNames:
          operation.subjectNames && operation.subjectNames.length > 0
            ? operation.subjectNames
            : result.data.subjects,
      }
    } else {
      payload.logger.warn({
        msg: 'ISBN lookup failed',
        isbn: operation.isbn,
        error: result.error,
      })
    }
  } catch (error) {
    payload.logger.error({
      msg: 'Error during ISBN lookup',
      isbn: operation.isbn,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return operation
}

/**
 * Preview phase: Parse, validate, and detect duplicates without database writes
 *
 * @param csvContent - Raw CSV file content
 * @param options - Import options
 * @param payload - Payload instance
 * @returns Preview result with validation issues
 */
export async function previewCSVImport(
  csvContent: string,
  options: CSVImportOptions,
  payload: Payload,
): Promise<PreviewResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // 1. Parse CSV
  let operations = parseCSV(csvContent)

  // 2. Optional: Enrich from ISBN lookup
  if (opts.autoPopulateFromISBN) {
    const enrichedOperations: BookOperation[] = []
    for (const operation of operations) {
      enrichedOperations.push(await enrichFromISBN(operation, payload))
    }
    operations = enrichedOperations
  }

  // 3. Validate all operations
  const validationIssues: ValidationIssue[] = []
  for (const operation of operations) {
    const issues = validateBookOperation(operation)
    validationIssues.push(...issues)
  }

  // 4. Detect duplicates and apply strategy
  const { operations: operationsWithDuplicates, issues: duplicateIssues } =
    await detectAndHandleDuplicates(payload, operations, opts.duplicateStrategy)

  // Merge all issues
  const allIssues = [...validationIssues, ...duplicateIssues]

  // 5. Build results
  const results: BookOperationResult[] = operationsWithDuplicates.map((operation) => {
    const operationIssues = allIssues.filter((issue) => issue.rowIndex === operation.rowIndex)
    const isValid = isOperationValid(operationIssues)

    return {
      operation,
      isValid,
      issues: operationIssues,
      existingBookId: operation.existingBookId,
    }
  })

  // 6. Calculate statistics
  const validOperations = results.filter((r) => r.isValid).length
  const invalidOperations = results.length - validOperations

  const operationsByType = {
    create: results.filter((r) => r.operation.operationType === BookOperationType.CREATE).length,
    update: results.filter((r) => r.operation.operationType === BookOperationType.UPDATE).length,
    skip: results.filter((r) => r.operation.operationType === BookOperationType.SKIP).length,
  }

  const hasErrors = allIssues.some((issue) => issue.severity === ValidationSeverity.ERROR)
  const hasWarnings = allIssues.some((issue) => issue.severity === ValidationSeverity.WARNING)

  return {
    totalOperations: results.length,
    validOperations,
    invalidOperations,
    operationsByType,
    results,
    issues: allIssues,
    hasErrors,
    hasWarnings,
  }
}

/**
 * Finds or creates a category by name
 *
 * @param payload - Payload instance
 * @param categoryName - Category name
 * @returns Category ID or null
 */
async function findOrCreateCategory(
  payload: Payload,
  categoryName: string,
  cache: Map<string, number>,
): Promise<number | null> {
  if (!categoryName) return null

  // Check cache first (prevents race conditions)
  if (cache.has(categoryName)) {
    return cache.get(categoryName)!
  }

  try {
    // Try to find existing
    const existing = await payload.find({
      collection: 'categories',
      where: {
        name: {
          equals: categoryName,
        },
      },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      const categoryId = existing.docs[0].id
      cache.set(categoryName, categoryId)
      return categoryId
    }

    // Create new
    const category = await payload.create({
      collection: 'categories',
      data: {
        name: categoryName,
        slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
      },
    })

    cache.set(categoryName, category.id)
    return category.id
  } catch (error) {
    // Handle duplicate key error (race condition on create)
    if (error instanceof Error && error.message.includes('duplicate')) {
      // Retry find
      const existing = await payload.find({
        collection: 'categories',
        where: {
          name: {
            equals: categoryName,
          },
        },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        const categoryId = existing.docs[0].id
        cache.set(categoryName, categoryId)
        return categoryId
      }
    }

    payload.logger.error({
      msg: 'Failed to find or create category',
      categoryName,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

/**
 * Executes a single book operation (create or update)
 *
 * @param payload - Payload instance
 * @param operation - Book operation to execute
 * @param options - Import options
 * @param categoryCache - Cache for category IDs to prevent race conditions
 * @returns Created or updated book ID
 */
async function executeBookOperation(
  payload: Payload,
  operation: BookOperation,
  options: Required<CSVImportOptions>,
  categoryCache: Map<string, number>,
): Promise<number> {
  // 1. Handle category
  let categoryId: number | null = null
  if (operation.categoryName && options.autoCreateCategories) {
    categoryId = await findOrCreateCategory(payload, operation.categoryName, categoryCache)
  }

  // 2. Download cover image if URL provided (with SSRF protection)
  let coverImageId: number | null = null
  if (operation.coverImageUrl && options.downloadCoverImages) {
    const validatedUrl = validateImageURL(operation.coverImageUrl)
    if (validatedUrl) {
      coverImageId = await downloadCoverImageIfPresent(payload, validatedUrl, {
        bookTitle: operation.title,
        alt: `Cover of ${operation.title}`,
      })
    } else {
      payload.logger.warn({
        msg: 'Invalid cover image URL blocked',
        url: operation.coverImageUrl,
        title: operation.title,
      })
    }
  }

  // 3. Prepare book data
  // Note: Type assertion required due to Payload's complex type system with optional fields,
  // conditional spreads, and dynamically generated types. All fields are validated at runtime.
  const bookData = {
    title: operation.title,
    author: operation.author,
    isbn: operation.isbn,
    oclcNumber: operation.oclc,
    publisher: operation.publisher,
    publishedDate: operation.publishedDate,
    synopsis: operation.synopsis,
    // Note: description is richText (Lexical), not supported in CSV import
    costPrice: operation.costPrice,
    sellPrice: operation.sellPrice,
    memberPrice: operation.memberPrice,
    currency: (operation.currency || options.defaultCurrency) as SupportedCurrency,
    stockQuantity: operation.stockQuantity ?? 0,
    reorderLevel: operation.reorderLevel ?? 5,
    stockStatus: (operation.stockStatus || 'IN_STOCK') as
      | 'IN_STOCK'
      | 'LOW_STOCK'
      | 'OUT_OF_STOCK'
      | 'DISCONTINUED',
    isDigital: operation.isDigital ?? false,
    downloadUrl: operation.downloadUrl,
    fileSize: operation.fileSize,
    ...(categoryId && { categories: [categoryId] }),
    ...(coverImageId && { coverImage: coverImageId }),
  } as any

  // 4. Create or update book
  let bookId: number

  if (operation.operationType === BookOperationType.UPDATE && operation.existingBookId) {
    // Update existing book
    await payload.update({
      collection: 'books',
      id: operation.existingBookId,
      data: bookData,
    })
    bookId = operation.existingBookId
  } else {
    // Create new book
    const created = await payload.create({
      collection: 'books',
      data: bookData,
      draft: false,
    })
    bookId = created.id
  }

  // 5. Handle subjects (using Phase 3.7 infrastructure)
  if (operation.subjectNames && operation.subjectNames.length > 0 && options.autoCreateSubjects) {
    await processAndLinkSubjects(payload, bookId, operation.subjectNames, {
      maxSubjects: 10,
      skipGeneric: true,
    })
  }

  return bookId
}

/**
 * Execute phase: Process validated operations and write to database
 *
 * @param previewResult - Result from preview phase
 * @param options - Import options
 * @param payload - Payload instance
 * @returns Execution result with created/updated IDs
 */
export async function executeCSVImport(
  previewResult: PreviewResult,
  options: CSVImportOptions,
  payload: Payload,
): Promise<ExecutionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Filter to only valid operations that should be executed
  const operationsToExecute = previewResult.results
    .filter((r) => r.isValid && r.operation.operationType !== BookOperationType.SKIP)
    .map((r) => r.operation)

  const result: ExecutionResult = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    skipped: previewResult.results.filter(
      (r) => r.operation.operationType === BookOperationType.SKIP,
    ).length,
    createdBookIds: [],
    updatedBookIds: [],
    errors: [],
  }

  // Create category cache to prevent race conditions during parallel processing
  const categoryCache = new Map<string, number>()

  // Process in batches
  const batchSize = opts.batchSize

  for (let i = 0; i < operationsToExecute.length; i += batchSize) {
    const batch = operationsToExecute.slice(i, i + batchSize)

    for (const operation of batch) {
      result.totalProcessed++

      try {
        const bookId = await executeBookOperation(payload, operation, opts, categoryCache)

        result.successful++

        if (operation.operationType === BookOperationType.UPDATE) {
          result.updatedBookIds.push(bookId)
        } else {
          result.createdBookIds.push(bookId)
        }

        payload.logger.info({
          msg: 'Book imported successfully',
          bookId,
          title: operation.title,
          operationType: operation.operationType,
        })
      } catch (error) {
        result.failed++
        result.errors.push({
          operation,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        payload.logger.error({
          msg: 'Failed to import book',
          title: operation.title,
          rowIndex: operation.rowIndex,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        // Stop immediately on first error if stopOnError is enabled
        if (opts.stopOnError) {
          payload.logger.warn({
            msg: 'Import stopped due to error (stopOnError=true)',
            processedCount: result.totalProcessed,
            successfulCount: result.successful,
            failedCount: result.failed,
          })
          return result
        }
      }
    }
  }

  return result
}

/**
 * Complete import workflow: preview + execute in one step
 *
 * @param csvContent - Raw CSV file content
 * @param options - Import options
 * @param payload - Payload instance
 * @returns Execution result
 */
export async function importCSV(
  csvContent: string,
  options: CSVImportOptions,
  payload: Payload,
): Promise<ExecutionResult> {
  const preview = await previewCSVImport(csvContent, options, payload)

  // Don't execute if there are errors
  if (preview.hasErrors) {
    throw new Error('CSV contains validation errors. Fix errors before importing.')
  }

  return executeCSVImport(preview, options, payload)
}
