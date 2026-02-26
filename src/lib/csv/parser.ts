/**
 * CSV Parser
 * Parses CSV files and converts rows to BookOperations
 *
 * @module csv/parser
 */

import Papa from 'papaparse'
import type { BookOperation } from './types'
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
 * Sanitises CSV values to prevent CSV injection attacks
 * Prefixes dangerous characters with a single quote to prevent formula execution
 *
 * Note: '-' is intentionally NOT included as a dangerous character because it is
 * commonly used in book titles (e.g., "Anti-Oedipus", "-isms: A Graphic Guide").
 * While '-' can be used in spreadsheet formulas, the risk is minimal for data
 * being imported into a database rather than opened in a spreadsheet.
 *
 * @param value - String value from CSV
 * @returns Sanitised string or undefined
 */
function sanitiseCSVValue(value: string | undefined): string | undefined {
  if (!value) return value

  const trimmed = value.trim()
  const dangerousChars = ['=', '+', '@', '|', '\t', '\r']

  if (dangerousChars.some((char) => trimmed.startsWith(char))) {
    // Prefix with single quote to prevent formula execution
    return `'${trimmed}`
  }

  return value
}

/**
 * Sanitises array of CSV values
 *
 * @param values - Array of strings
 * @returns Array of sanitised strings
 */
function sanitiseArray(values: string[] | undefined): string[] | undefined {
  if (!values) return values
  return values.map((value) => sanitiseCSVValue(value) || '')
}

/**
 * Required columns for CSV import
 */
export const REQUIRED_COLUMNS = ['title']

/**
 * All valid column names (normalized)
 */
export const VALID_COLUMNS = [
  'title',
  'author',
  'isbn',
  'oclc',
  'oclcnumber',
  'publisher',
  'publisheddate',
  'description',
  'synopsis',
  'costprice',
  'sellprice',
  'memberprice',
  'currency',
  'stockquantity',
  'reorderlevel',
  'stockstatus',
  'category',
  'categoryname',
  'subjects',
  'subjectnames',
  'coverimageurl',
  'externalcoverurl',
  'isdigital',
  'downloadurl',
  'filesize',
]

/**
 * Parses CSV content into book operations
 *
 * @param csvContent - Raw CSV file content
 * @param maxRows - Optional limit on number of rows to parse (for quick validation)
 * @returns Array of book operations with row indices
 */
export function parseCSV(csvContent: string, maxRows?: number): BookOperation[] {
  // Parse CSV using PapaParse
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
    preview: maxRows, // Limit rows if specified
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

      // Required (sanitised to prevent CSV injection)
      title: sanitiseCSVValue(row.title?.trim()) || '',

      // Optional identification (sanitised)
      author: sanitiseCSVValue(row.author?.trim()),
      isbn: sanitiseCSVValue(row.isbn?.trim()),
      oclc: sanitiseCSVValue(oclcValue?.trim()),

      // Pricing (numbers don't need sanitisation)
      costPrice: parseNumber(row.costprice),
      sellPrice: parseNumber(row.sellprice),
      memberPrice: parseNumber(row.memberprice),
      currency: row.currency?.trim().toUpperCase() || undefined,

      // Inventory (numbers and enum values don't need sanitisation)
      stockQuantity: parseNumber(row.stockquantity),
      reorderLevel: parseNumber(row.reorderlevel),
      stockStatus: row.stockstatus?.trim().toUpperCase() || undefined,

      // Categorisation (sanitised)
      categoryName: sanitiseCSVValue(categoryValue?.trim())?.replace(/\s*\/\s*/g, '/'),
      subjectNames: sanitiseArray(parseArray(subjectsValue)),

      // Metadata (sanitised)
      publisher: sanitiseCSVValue(row.publisher?.trim()),
      publishedDate: sanitiseCSVValue(row.publisheddate?.trim()),
      description: sanitiseCSVValue(row.description?.trim()),
      coverImageUrl: coverImageValue?.trim() || undefined, // URLs validated separately by SSRF protection

      // Digital products (sanitised)
      isDigital: parseBoolean(row.isdigital),
      downloadUrl: row.downloadurl?.trim() || undefined, // URLs validated separately
      fileSize: sanitiseCSVValue(row.filesize?.trim()),
    }
  })

  return operations
}

/**
 * Gets CSV metadata without parsing all rows
 *
 * @param csvContent - Raw CSV file content
 * @returns Detected columns and total row count
 */
export function getCSVMetadata(csvContent: string): {
  detectedColumns: string[]
  totalRows: number
  missingRequiredColumns: string[]
} {
  // Parse just the header and a few rows to get metadata
  const result = Papa.parse<Record<string, string>>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
    preview: 1, // Just need header
  })

  const detectedColumns = result.meta.fields || []

  // Count total rows by counting newlines (minus header)
  const lines = csvContent.split('\n').filter((line) => line.trim() !== '')
  const totalRows = Math.max(0, lines.length - 1) // Subtract header row

  // Check for missing required columns
  const missingRequiredColumns = REQUIRED_COLUMNS.filter((col) => !detectedColumns.includes(col))

  return {
    detectedColumns,
    totalRows,
    missingRequiredColumns,
  }
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
