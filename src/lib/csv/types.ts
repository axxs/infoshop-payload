/**
 * CSV Import Types
 * Type definitions for CSV bulk import functionality
 *
 * @module csv/types
 */

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'ERROR', // Blocks import
  WARNING = 'WARNING', // Allows import but flags issue
  INFO = 'INFO', // Informational only
}

/**
 * Validation issue codes for specific errors
 */
export enum ValidationCode {
  // Required fields
  REQUIRED_FIELD = 'REQUIRED_FIELD',

  // Pricing
  INCOMPLETE_PRICING = 'INCOMPLETE_PRICING',
  NEGATIVE_MARGIN = 'NEGATIVE_MARGIN',
  INVALID_DISCOUNT = 'INVALID_DISCOUNT',
  INVALID_PRICE = 'INVALID_PRICE',

  // Identification
  INVALID_ISBN_LENGTH = 'INVALID_ISBN_LENGTH',
  INVALID_ISBN_FORMAT = 'INVALID_ISBN_FORMAT',

  // Stock
  INVALID_STOCK = 'INVALID_STOCK',
  NEGATIVE_REORDER_LEVEL = 'NEGATIVE_REORDER_LEVEL',

  // Digital products
  MISSING_DOWNLOAD_URL = 'MISSING_DOWNLOAD_URL',
  DIGITAL_WITH_STOCK = 'DIGITAL_WITH_STOCK',

  // Currency
  INVALID_CURRENCY = 'INVALID_CURRENCY',

  // Duplicates
  DUPLICATE_ISBN = 'DUPLICATE_ISBN',
  DUPLICATE_TITLE_AUTHOR = 'DUPLICATE_TITLE_AUTHOR',
}

/**
 * Duplicate handling strategies
 */
export enum DuplicateStrategy {
  SKIP = 'SKIP', // Skip duplicate, don't import
  UPDATE = 'UPDATE', // Update existing book with new data
  WARN = 'WARN', // Create new book, but warn user
  ERROR = 'ERROR', // Block import (frontend validation only)
}

/**
 * Book operation types
 */
export enum BookOperationType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  SKIP = 'SKIP',
}

/**
 * Validation issue for a specific field
 */
export interface ValidationIssue {
  severity: ValidationSeverity
  field: string
  message: string
  code: ValidationCode
  rowIndex: number
}

/**
 * Raw CSV row data (parsed from file)
 */
export interface CSVRow {
  // Required
  title: string

  // Optional identification
  author?: string
  isbn?: string
  oclc?: string
  oclcNumber?: string

  // Pricing (all or none)
  costPrice?: string
  sellPrice?: string
  memberPrice?: string
  currency?: string

  // Inventory
  stockQuantity?: string
  reorderLevel?: string

  // Categorisation
  category?: string
  categoryName?: string
  subjects?: string
  subjectNames?: string

  // Metadata
  publisher?: string
  publishedDate?: string
  description?: string
  coverImageUrl?: string
  externalCoverUrl?: string

  // Digital products
  isDigital?: string
  downloadUrl?: string
  fileSize?: string

  // Stock status
  stockStatus?: string
}

/**
 * Parsed and validated book operation
 */
export interface BookOperation {
  operationType: BookOperationType
  rowIndex: number

  // Required
  title: string

  // Optional identification
  author?: string
  isbn?: string
  oclc?: string

  // Pricing
  costPrice?: number
  sellPrice?: number
  memberPrice?: number
  currency?: string

  // Inventory
  stockQuantity?: number
  reorderLevel?: number
  stockStatus?: string

  // Categorisation
  categoryName?: string
  subjectNames?: string[]

  // Metadata
  publisher?: string
  publishedDate?: string
  description?: string
  coverImageUrl?: string

  // Digital products
  isDigital?: boolean
  downloadUrl?: string
  fileSize?: string

  // For updates
  existingBookId?: number
}

/**
 * Result of validating a single book operation
 */
export interface BookOperationResult {
  operation: BookOperation
  isValid: boolean // No ERROR-level issues
  issues: ValidationIssue[]
  existingBookId?: number // If duplicate found
}

/**
 * CSV import options
 */
export interface CSVImportOptions {
  /** How to handle duplicate books */
  duplicateStrategy?: DuplicateStrategy

  /** Auto-create categories if they don't exist */
  autoCreateCategories?: boolean

  /** Auto-create subjects if they don't exist */
  autoCreateSubjects?: boolean

  /** Auto-populate missing data from ISBN lookup (Open Library) */
  autoPopulateFromISBN?: boolean

  /** Download cover images from URLs */
  downloadCoverImages?: boolean

  /** Default currency if not specified */
  defaultCurrency?: string

  /** Number of books to process per batch */
  batchSize?: number

  /**
   * Stop import on first error to prevent partial imports
   *
   * ⚠️ WARNING: This is NOT a true database transaction. If an error occurs:
   * - With stopOnError=true: Import stops immediately, but previous operations remain committed
   * - With stopOnError=false: Import continues, accumulating errors
   *
   * For true transactional safety with automatic rollback:
   * - PostgreSQL/SQLite: Use database backup/restore or manual transaction management
   * - MongoDB: Requires replica set configuration for multi-document transactions
   *
   * @default false
   */
  stopOnError?: boolean
}

/**
 * Preview result (validation phase)
 */
export interface PreviewResult {
  totalOperations: number
  validOperations: number
  invalidOperations: number
  operationsByType: {
    create: number
    update: number
    skip: number
  }
  results: BookOperationResult[]
  issues: ValidationIssue[]
  hasErrors: boolean
  hasWarnings: boolean
}

/**
 * Execution result (database write phase)
 */
export interface ExecutionResult {
  totalProcessed: number
  successful: number
  failed: number
  skipped: number
  createdBookIds: number[]
  updatedBookIds: number[]
  errors: Array<{
    operation: BookOperation
    error: string
  }>
}
