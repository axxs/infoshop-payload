/**
 * Books JSON Import Endpoint
 * POST /api/books/import
 *
 * Imports books from JSON array with same validation and options as CSV import
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { requireRole } from '@/lib/access'
import { validateBookOperation, isOperationValid } from '@/lib/csv/validator'
import { detectAndHandleDuplicates } from '@/lib/csv/duplicateDetector'
import { processAndLinkSubjects } from '@/lib/openLibrary/subjectManager'
import { downloadCoverImageIfPresent } from '@/lib/openLibrary/imageDownloader'
import { validateImageURL } from '@/lib/urlValidator'
import type { Book } from '@/payload-types'
import type { SupportedCurrency } from '@/lib/square/constants'
import type {
  BookOperation,
  BookOperationResult,
  CSVImportOptions,
  PreviewResult,
  ExecutionResult,
  ValidationIssue,
} from '@/lib/csv/types'
import { BookOperationType, ValidationSeverity, DuplicateStrategy } from '@/lib/csv/types'

/**
 * Normalise a partial date string into an ISO 8601 date that Postgres can accept.
 */
function normaliseDate(value: string | null | undefined): string | null {
  if (!value || value.trim() === '') return null
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed
  if (/^\d{4}$/.test(trimmed)) return `${trimmed}-01-01`
  if (/^\d{4}-\d{1,2}$/.test(trimmed)) {
    const [year, month] = trimmed.split('-')
    return `${year}-${month.padStart(2, '0')}-01`
  }
  return null
}
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimit'

/**
 * Default import options
 */
const DEFAULT_OPTIONS: Required<CSVImportOptions> = {
  duplicateStrategy: DuplicateStrategy.WARN,
  autoCreateCategories: true,
  autoCreateSubjects: true,
  autoPopulateFromISBN: false, // Disabled for JSON import - data should be complete
  downloadCoverImages: true,
  defaultCurrency: 'USD',
  batchSize: 10,
  stopOnError: false,
  continueWithErrors: false,
}

interface JSONBookInput {
  title: string
  author?: string
  isbn?: string
  oclcNumber?: string
  publisher?: string
  publishedDate?: string
  synopsis?: string
  costPrice?: number
  sellPrice?: number
  memberPrice?: number
  currency?: string
  stockQuantity?: number
  reorderLevel?: number
  stockStatus?: string
  categoryName?: string
  subjectNames?: string[]
  coverImageUrl?: string
  isDigital?: boolean
  downloadUrl?: string
  fileSize?: string
}

/**
 * POST handler for JSON import
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 5 requests per minute
  const rateLimit = checkRateLimit(request, {
    maxRequests: 5,
    windowSeconds: 60,
  })

  const rateLimitHeaders = getRateLimitHeaders(5, rateLimit.remaining, rateLimit.resetAt)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      },
      {
        status: 429,
        headers: rateLimitHeaders,
      },
    )
  }

  try {
    const payload = await getPayload({ config })

    // Authorization check - only admin/volunteer can import books
    const auth = await requireRole(payload, request.headers, ['admin', 'volunteer'])
    if (!auth.authorized) return auth.response

    const body = await request.json()
    const {
      books,
      options: userOptions,
      execute = false,
    } = body as {
      books: JSONBookInput[]
      options?: CSVImportOptions
      execute?: boolean
    }

    if (!books || !Array.isArray(books)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Request body must contain a "books" array',
        },
        { status: 400 },
      )
    }

    if (books.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Books array cannot be empty',
        },
        { status: 400 },
      )
    }

    const opts = { ...DEFAULT_OPTIONS, ...userOptions }

    // Convert JSON books to BookOperations
    const operations: BookOperation[] = books.map((book, index) => ({
      operationType: BookOperationType.CREATE,
      rowIndex: index + 1,
      title: book.title || '',
      author: book.author,
      isbn: book.isbn,
      oclc: book.oclcNumber,
      costPrice: book.costPrice,
      sellPrice: book.sellPrice,
      memberPrice: book.memberPrice,
      currency: book.currency,
      stockQuantity: book.stockQuantity,
      reorderLevel: book.reorderLevel,
      stockStatus: book.stockStatus,
      categoryName: book.categoryName,
      subjectNames: book.subjectNames,
      coverImageUrl: book.coverImageUrl,
      isDigital: book.isDigital,
      downloadUrl: book.downloadUrl,
      fileSize: book.fileSize,
    }))

    // Validate all operations
    const validationIssues: ValidationIssue[] = []
    for (const operation of operations) {
      const issues = validateBookOperation(operation)
      validationIssues.push(...issues)
    }

    // Detect duplicates
    const { operations: operationsWithDuplicates, issues: duplicateIssues } =
      await detectAndHandleDuplicates(payload, operations, opts.duplicateStrategy)

    const allIssues = [...validationIssues, ...duplicateIssues]

    // Build results
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

    // Calculate statistics
    const validOperations = results.filter((r) => r.isValid).length
    const invalidOperations = results.length - validOperations

    const operationsByType = {
      create: results.filter((r) => r.operation.operationType === BookOperationType.CREATE).length,
      update: results.filter((r) => r.operation.operationType === BookOperationType.UPDATE).length,
      skip: results.filter((r) => r.operation.operationType === BookOperationType.SKIP).length,
    }

    const hasErrors = allIssues.some((issue) => issue.severity === ValidationSeverity.ERROR)
    const hasWarnings = allIssues.some((issue) => issue.severity === ValidationSeverity.WARNING)

    const previewResult: PreviewResult = {
      totalOperations: results.length,
      validOperations,
      invalidOperations,
      operationsByType,
      results,
      issues: allIssues,
      hasErrors,
      hasWarnings,
    }

    // If not executing, return preview only
    if (!execute) {
      return NextResponse.json(
        {
          success: true,
          preview: previewResult,
        },
        { headers: rateLimitHeaders },
      )
    }

    // Check for errors (unless continueWithErrors is enabled)
    if (hasErrors && !opts.continueWithErrors) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Cannot execute import with validation errors. Fix errors or set continueWithErrors: true',
          preview: previewResult,
        },
        { status: 400, headers: rateLimitHeaders },
      )
    }

    // Execute import
    const executionResult = await executeJSONImport(previewResult, opts, payload)

    return NextResponse.json(
      {
        success: true,
        preview: previewResult,
        result: executionResult,
      },
      { headers: rateLimitHeaders },
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import books',
      },
      { status: 500 },
    )
  }
}

/**
 * Executes the JSON import
 */
async function executeJSONImport(
  previewResult: PreviewResult,
  options: Required<CSVImportOptions>,
  payload: Awaited<ReturnType<typeof getPayload>>,
): Promise<ExecutionResult> {
  // Filter operations to execute
  const operationsToExecute = previewResult.results
    .filter((r) => {
      if (r.operation.operationType === BookOperationType.SKIP) return false
      return options.continueWithErrors || r.isValid
    })
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

  const categoryCache = new Map<string, number>()

  for (const operation of operationsToExecute) {
    result.totalProcessed++

    try {
      const bookId = await executeBookOperation(payload, operation, options, categoryCache)

      result.successful++

      if (operation.operationType === BookOperationType.UPDATE) {
        result.updatedBookIds.push(bookId)
      } else {
        result.createdBookIds.push(bookId)
      }
    } catch (error) {
      result.failed++
      result.errors.push({
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      if (options.stopOnError) {
        break
      }
    }
  }

  return result
}

/**
 * Executes a single book operation
 */
async function executeBookOperation(
  payload: Awaited<ReturnType<typeof getPayload>>,
  operation: BookOperation,
  options: Required<CSVImportOptions>,
  categoryCache: Map<string, number>,
): Promise<number> {
  // Handle category
  let categoryId: number | null = null
  if (operation.categoryName && options.autoCreateCategories) {
    categoryId = await findOrCreateCategory(payload, operation.categoryName, categoryCache)
  }

  // Download cover image if URL provided
  let coverImageId: number | null = null
  if (operation.coverImageUrl && options.downloadCoverImages) {
    const validatedUrl = validateImageURL(operation.coverImageUrl)
    if (validatedUrl) {
      coverImageId = await downloadCoverImageIfPresent(payload, validatedUrl, {
        bookTitle: operation.title,
        alt: `Cover of ${operation.title}`,
      })
    }
  }

  // Prepare book data
  type BookCreateData = Omit<Book, 'id' | 'updatedAt' | 'createdAt' | 'deletedAt' | 'sizes'>

  const bookData: BookCreateData = {
    title: operation.title,
    author: operation.author || 'Unknown Author',
    isbn: operation.isbn ?? null,
    oclcNumber: operation.oclc ?? null,
    publisher: operation.publisher ?? null,
    publishedDate: normaliseDate(operation.publishedDate),
    synopsis: operation.synopsis ?? null,
    description: null,
    featured: null,
    costPrice: operation.costPrice ?? null,
    sellPrice: operation.sellPrice ?? null,
    memberPrice: operation.memberPrice ?? null,
    currency: (operation.currency || options.defaultCurrency) as SupportedCurrency,
    stockQuantity: operation.stockQuantity ?? 0,
    reorderLevel: operation.reorderLevel ?? 5,
    stockStatus: (operation.stockStatus || 'IN_STOCK') as Book['stockStatus'],
    categories: categoryId ? [categoryId] : null,
    subjects: null,
    _subjectNames: null,
    coverImage: coverImageId ?? null,
    externalCoverUrl: operation.coverImageUrl ?? null,
    isDigital: operation.isDigital ?? false,
    digitalFile: null,
  }

  let bookId: number

  if (operation.operationType === BookOperationType.UPDATE && operation.existingBookId) {
    await payload.update({
      collection: 'books',
      id: operation.existingBookId,
      data: bookData,
    })
    bookId = operation.existingBookId
  } else {
    const created = await payload.create({
      collection: 'books',
      data: bookData,
      draft: false,
    })
    bookId = created.id
  }

  // Handle subjects
  if (operation.subjectNames && operation.subjectNames.length > 0 && options.autoCreateSubjects) {
    await processAndLinkSubjects(payload, bookId, operation.subjectNames, {
      maxSubjects: 10,
      skipGeneric: true,
    })
  }

  return bookId
}

/**
 * Finds or creates a category by name
 */
async function findOrCreateCategory(
  payload: Awaited<ReturnType<typeof getPayload>>,
  categoryName: string,
  cache: Map<string, number>,
): Promise<number | null> {
  if (!categoryName) return null

  if (cache.has(categoryName)) {
    return cache.get(categoryName)!
  }

  try {
    const existing = await payload.find({
      collection: 'categories',
      where: { name: { equals: categoryName } },
      limit: 1,
    })

    if (existing.docs.length > 0) {
      const categoryId = existing.docs[0].id
      cache.set(categoryName, categoryId)
      return categoryId
    }

    const category = await payload.create({
      collection: 'categories',
      data: {
        name: categoryName,
        slug: categoryName.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'),
      },
    })

    cache.set(categoryName, category.id)
    return category.id
  } catch (error) {
    if (error instanceof Error && error.message.includes('duplicate')) {
      const existing = await payload.find({
        collection: 'categories',
        where: { name: { equals: categoryName } },
        limit: 1,
      })

      if (existing.docs.length > 0) {
        const categoryId = existing.docs[0].id
        cache.set(categoryName, categoryId)
        return categoryId
      }
    }
    return null
  }
}
