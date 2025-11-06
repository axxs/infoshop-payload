/**
 * Duplicate Detector
 * Detects duplicate books by ISBN or Title+Author and applies strategy
 *
 * @module csv/duplicateDetector
 */

import type { Payload } from 'payload'
import type { BookOperation, ValidationIssue } from './types'
import { BookOperationType, DuplicateStrategy, ValidationSeverity, ValidationCode } from './types'

/**
 * Result of duplicate detection
 */
interface DuplicateDetectionResult {
  isDuplicate: boolean
  existingBookId?: number
  matchedBy?: 'isbn' | 'title-author'
}

/**
 * Batch lookup structure for duplicate detection
 */
interface DuplicateLookup {
  byIsbn: Map<string, number> // ISBN -> bookId
  byTitleAuthor: Map<string, number> // "title|author" -> bookId
}

/**
 * Builds a batch lookup for duplicate detection (fixes N+1 query issue)
 *
 * @param payload - Payload instance
 * @param operations - All book operations to check
 * @returns Lookup maps for ISBN and title+author
 */
async function buildDuplicateLookup(
  payload: Payload,
  operations: BookOperation[],
): Promise<DuplicateLookup> {
  const lookup: DuplicateLookup = {
    byIsbn: new Map(),
    byTitleAuthor: new Map(),
  }

  // 1. Batch query: Find all books by ISBNs (single query)
  const isbnsToCheck = operations.map((op) => op.isbn).filter((isbn): isbn is string => !!isbn)

  if (isbnsToCheck.length > 0) {
    const existingByIsbn = await payload.find({
      collection: 'books',
      where: {
        isbn: {
          in: isbnsToCheck,
        },
      },
      limit: isbnsToCheck.length,
    })

    for (const book of existingByIsbn.docs) {
      if (book.isbn) {
        lookup.byIsbn.set(book.isbn, book.id)
      }
    }
  }

  // 2. Batch query: Find all books by Title+Author (single query)
  // Only check operations that didn't match by ISBN
  const titleAuthorPairs = operations
    .filter((op) => op.author && (!op.isbn || !lookup.byIsbn.has(op.isbn)))
    .map((op) => ({
      title: op.title,
      author: op.author!,
    }))

  if (titleAuthorPairs.length > 0) {
    // Build OR conditions for all title+author pairs
    const orConditions = titleAuthorPairs.map((pair) => ({
      and: [{ title: { equals: pair.title } }, { author: { equals: pair.author } }],
    }))

    const existingByTitleAuthor = await payload.find({
      collection: 'books',
      where: {
        or: orConditions as any, // Type assertion needed for complex Where conditions
      },
      limit: titleAuthorPairs.length,
    })

    for (const book of existingByTitleAuthor.docs) {
      if (book.title && book.author) {
        const key = `${book.title}|${book.author}`
        lookup.byTitleAuthor.set(key, book.id)
      }
    }
  }

  return lookup
}

/**
 * Detects if a book operation is a duplicate using pre-built lookup
 *
 * @param operation - Book operation to check
 * @param lookup - Pre-built duplicate lookup
 * @returns Detection result with existing book ID if found
 */
function detectDuplicate(
  operation: BookOperation,
  lookup: DuplicateLookup,
): DuplicateDetectionResult {
  // 1. Check by ISBN (if provided)
  if (operation.isbn && lookup.byIsbn.has(operation.isbn)) {
    return {
      isDuplicate: true,
      existingBookId: lookup.byIsbn.get(operation.isbn)!,
      matchedBy: 'isbn',
    }
  }

  // 2. Fallback: Check by Title + Author (if author provided)
  if (operation.author) {
    const key = `${operation.title}|${operation.author}`
    if (lookup.byTitleAuthor.has(key)) {
      return {
        isDuplicate: true,
        existingBookId: lookup.byTitleAuthor.get(key)!,
        matchedBy: 'title-author',
      }
    }
  }

  return {
    isDuplicate: false,
  }
}

/**
 * Applies duplicate handling strategy to operation
 *
 * @param operation - Book operation
 * @param detectionResult - Result from duplicate detection
 * @param strategy - Duplicate handling strategy
 * @returns Updated operation and validation issues
 */
function applyDuplicateStrategy(
  operation: BookOperation,
  detectionResult: DuplicateDetectionResult,
  strategy: DuplicateStrategy,
): { operation: BookOperation; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = []

  if (!detectionResult.isDuplicate) {
    return { operation, issues }
  }

  const matchField = detectionResult.matchedBy === 'isbn' ? 'isbn' : 'title + author'

  switch (strategy) {
    case DuplicateStrategy.SKIP:
      // Change operation type to SKIP
      operation.operationType = BookOperationType.SKIP
      operation.existingBookId = detectionResult.existingBookId

      issues.push({
        severity: ValidationSeverity.INFO,
        field: matchField,
        message: `Duplicate found (matched by ${matchField}), skipping import`,
        code:
          detectionResult.matchedBy === 'isbn'
            ? ValidationCode.DUPLICATE_ISBN
            : ValidationCode.DUPLICATE_TITLE_AUTHOR,
        rowIndex: operation.rowIndex,
      })
      break

    case DuplicateStrategy.UPDATE:
      // Change operation type to UPDATE
      operation.operationType = BookOperationType.UPDATE
      operation.existingBookId = detectionResult.existingBookId

      issues.push({
        severity: ValidationSeverity.INFO,
        field: matchField,
        message: `Duplicate found (matched by ${matchField}), will update existing book`,
        code:
          detectionResult.matchedBy === 'isbn'
            ? ValidationCode.DUPLICATE_ISBN
            : ValidationCode.DUPLICATE_TITLE_AUTHOR,
        rowIndex: operation.rowIndex,
      })
      break

    case DuplicateStrategy.WARN:
      // Keep as CREATE but add warning
      operation.existingBookId = detectionResult.existingBookId

      issues.push({
        severity: ValidationSeverity.WARNING,
        field: matchField,
        message: `Duplicate found (matched by ${matchField}), will create new book anyway`,
        code:
          detectionResult.matchedBy === 'isbn'
            ? ValidationCode.DUPLICATE_ISBN
            : ValidationCode.DUPLICATE_TITLE_AUTHOR,
        rowIndex: operation.rowIndex,
      })
      break

    case DuplicateStrategy.ERROR:
      // This is frontend validation only, not handled in backend
      // But we can still add an error for consistency
      issues.push({
        severity: ValidationSeverity.ERROR,
        field: matchField,
        message: `Duplicate found (matched by ${matchField}), import blocked`,
        code:
          detectionResult.matchedBy === 'isbn'
            ? ValidationCode.DUPLICATE_ISBN
            : ValidationCode.DUPLICATE_TITLE_AUTHOR,
        rowIndex: operation.rowIndex,
      })
      break
  }

  return { operation, issues }
}

/**
 * Detects duplicates and applies strategy to all operations
 * Uses batch queries (2 queries total) instead of N+1 queries
 *
 * @param payload - Payload instance
 * @param operations - Array of book operations
 * @param strategy - Duplicate handling strategy
 * @returns Updated operations and duplicate validation issues
 */
export async function detectAndHandleDuplicates(
  payload: Payload,
  operations: BookOperation[],
  strategy: DuplicateStrategy = DuplicateStrategy.WARN,
): Promise<{ operations: BookOperation[]; issues: ValidationIssue[] }> {
  const updatedOperations: BookOperation[] = []
  const allIssues: ValidationIssue[] = []

  // Build lookup maps with batch queries (fixes N+1 query issue)
  const lookup = await buildDuplicateLookup(payload, operations)

  for (const operation of operations) {
    // Detect duplicate using pre-built lookup (no queries here)
    const detectionResult = detectDuplicate(operation, lookup)

    // Apply strategy
    const { operation: updatedOperation, issues } = applyDuplicateStrategy(
      operation,
      detectionResult,
      strategy,
    )

    updatedOperations.push(updatedOperation)
    allIssues.push(...issues)
  }

  return {
    operations: updatedOperations,
    issues: allIssues,
  }
}
