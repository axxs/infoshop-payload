/**
 * Validation utilities for reporting APIs
 */

export interface DateValidationResult {
  isValid: boolean
  error?: string
  startDate?: Date
  endDate?: Date
}

/**
 * Validates date range parameters for reporting APIs
 *
 * @param startDateParam - Start date string in YYYY-MM-DD format
 * @param endDateParam - End date string in YYYY-MM-DD format
 * @returns Validation result with parsed dates or error message
 */
export function validateDateRange(
  startDateParam: string,
  endDateParam: string,
): DateValidationResult {
  // Parse dates
  const startDate = new Date(startDateParam)
  const endDate = new Date(endDateParam)

  // Check for invalid date format
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date format. Use YYYY-MM-DD',
    }
  }

  // Check for invalid date range
  if (startDate > endDate) {
    return {
      isValid: false,
      error: 'startDate cannot be after endDate',
    }
  }

  return {
    isValid: true,
    startDate,
    endDate,
  }
}

/**
 * Formats currency values to 2 decimal places
 * IMPORTANT: This uses floating-point arithmetic which can have precision issues.
 * For production systems handling large volumes, consider using integer cents or decimal.js
 *
 * @param value - The numeric value to format
 * @returns Formatted value with 2 decimal places
 */
export function formatCurrency(value: number): number {
  return Number(value.toFixed(2))
}
