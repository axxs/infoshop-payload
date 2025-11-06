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
 * Detects if a book operation is a duplicate
 *
 * @param payload - Payload instance
 * @param operation - Book operation to check
 * @returns Detection result with existing book ID if found
 */
async function detectDuplicate(
  payload: Payload,
  operation: BookOperation,
): Promise<DuplicateDetectionResult> {
  // 1. Check by ISBN (if provided)
  if (operation.isbn) {
    const existingByIsbn = await payload.find({
      collection: 'books',
      where: {
        isbn: {
          equals: operation.isbn,
        },
      },
      limit: 1,
    })

    if (existingByIsbn.docs.length > 0) {
      return {
        isDuplicate: true,
        existingBookId: existingByIsbn.docs[0].id,
        matchedBy: 'isbn',
      }
    }
  }

  // 2. Fallback: Check by Title + Author (if author provided)
  if (operation.author) {
    const existingByTitleAuthor = await payload.find({
      collection: 'books',
      where: {
        and: [
          {
            title: {
              equals: operation.title,
            },
          },
          {
            author: {
              equals: operation.author,
            },
          },
        ],
      },
      limit: 1,
    })

    if (existingByTitleAuthor.docs.length > 0) {
      return {
        isDuplicate: true,
        existingBookId: existingByTitleAuthor.docs[0].id,
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

  for (const operation of operations) {
    // Detect duplicate
    const detectionResult = await detectDuplicate(payload, operation)

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
