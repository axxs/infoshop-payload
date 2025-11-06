/**
 * CSV Parser
 * Parses CSV files and converts rows to BookOperations
 *
 * @module csv/parser
 */

import Papa from 'papaparse'
import type { CSVRow, BookOperation } from './types'
import { BookOperationType } from './types'

/**
 * Normalizes a CSV header name for consistent matching
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes internal whitespace
 *
 * @param header - Raw header string
 * @returns Normalized header
 */
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * Parses a boolean value from CSV string
 * Accepts: "true", "yes", "1" (case-insensitive)
 *
 * @param value - String value from CSV
 * @returns Boolean or undefined
 */
function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase().trim()
  return normalized === 'true' || normalized === 'yes' || normalized === '1'
}

/**
 * Parses a number from CSV string
 *
 * @param value - String value from CSV
 * @returns Number or undefined
 */
function parseNumber(value: string | undefined): number | undefined {
  if (!value || value.trim() === '') return undefined
  const num = parseFloat(value)
  return isNaN(num) ? undefined : num
}

/**
 * Parses a comma-separated string into array
 *
 * @param value - String value from CSV
 * @returns Array of trimmed strings
 */
function parseArray(value: string | undefined): string[] | undefined {
  if (!value || value.trim() === '') return undefined
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

/**
 * Parses CSV content into book operations
 *
 * @param csvContent - Raw CSV file content
 * @returns Array of book operations with row indices
 */
export function parseCSV(csvContent: string): BookOperation[] {
  // Parse CSV using PapaParse
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  })

  if (result.errors.length > 0) {
    throw new Error(`CSV parsing error: ${result.errors[0].message}`)
  }

  // Convert rows to BookOperations
  const operations: BookOperation[] = result.data.map((row, index) => {
    // Handle alternative column names
    const oclcValue = row.oclc || row.oclcnumber
    const categoryValue = row.category || row.categoryname
    const subjectsValue = row.subjects || row.subjectnames
    const coverImageValue = row.coverimageurl || row.externalcoverurl

    return {
      operationType: BookOperationType.CREATE, // Will be updated by duplicate detector
      rowIndex: index + 2, // +2 because: 0-indexed + header row + 1-indexed display

      // Required
      title: row.title?.trim() || '',

      // Optional identification
      author: row.author?.trim() || undefined,
      isbn: row.isbn?.trim() || undefined,
      oclc: oclcValue?.trim() || undefined,

      // Pricing
      costPrice: parseNumber(row.costprice),
      sellPrice: parseNumber(row.sellprice),
      memberPrice: parseNumber(row.memberprice),
      currency: row.currency?.trim().toUpperCase() || undefined,

      // Inventory
      stockQuantity: parseNumber(row.stockquantity),
      reorderLevel: parseNumber(row.reorderlevel),
      stockStatus: row.stockstatus?.trim() || undefined,

      // Categorisation
      categoryName: categoryValue?.trim() || undefined,
      subjectNames: parseArray(subjectsValue),

      // Metadata
      publisher: row.publisher?.trim() || undefined,
      publishedDate: row.publisheddate?.trim() || undefined,
      description: row.description?.trim() || undefined,
      coverImageUrl: coverImageValue?.trim() || undefined,

      // Digital products
      isDigital: parseBoolean(row.isdigital),
      downloadUrl: row.downloadurl?.trim() || undefined,
      fileSize: row.filesize?.trim() || undefined,
    }
  })

  return operations
}

/**
 * Generates a CSV template with sample data
 *
 * @returns CSV template string
 */
export function generateTemplate(): string {
  const headers = [
    'title',
    'author',
    'isbn',
    'oclcNumber',
    'publisher',
    'publishedDate',
    'description',
    'costPrice',
    'sellPrice',
    'memberPrice',
    'currency',
    'stockQuantity',
    'reorderLevel',
    'stockStatus',
    'categoryName',
    'subjectNames',
    'coverImageUrl',
    'isDigital',
    'downloadUrl',
    'fileSize',
  ]

  const sampleRow = [
    'The Conquest of Bread',
    'Peter Kropotkin',
    '978-0-521-45990-3',
    '',
    'Cambridge University Press',
    '2015-01-01',
    'A foundational text on anarchist communism',
    '10.00',
    '15.00',
    '12.00',
    'USD',
    '25',
    '5',
    'IN_STOCK',
    'Political Theory',
    'Anarchism,Economics,Political Philosophy',
    'https://covers.openlibrary.org/b/isbn/9780521459907-L.jpg',
    'false',
    '',
    '',
  ]

  return Papa.unparse([headers, sampleRow])
}

/**
 * Converts validation errors to CSV format for download
 *
 * @param errors - Array of validation issues
 * @returns CSV string with error details
 */
export function generateErrorReport(
  errors: Array<{ row: number; field: string; severity: string; message: string }>,
): string {
  const headers = ['Row', 'Field', 'Severity', 'Message']
  const rows = errors.map((error) => [
    error.row.toString(),
    error.field,
    error.severity,
    error.message,
  ])

  return Papa.unparse([headers, ...rows])
}
