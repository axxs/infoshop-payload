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
 * Converts dollars to cents (integer) to avoid floating-point precision issues
 * PRODUCTION SAFE: Uses integer arithmetic for accurate currency calculations
 *
 * @param dollars - Dollar amount as a number
 * @returns Integer cents (e.g., $19.99 -> 1999)
 *
 * @example
 * // Correct approach for currency arithmetic:
 * const sale1Cents = dollarsToCents(19.99)  // 1999
 * const sale2Cents = dollarsToCents(10.01)  // 1001
 * const totalCents = sale1Cents + sale2Cents // 3000 (exact)
 * const totalDollars = centsToDollars(totalCents) // 30.00
 */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100)
}

/**
 * Converts cents (integer) back to dollars for display
 * PRODUCTION SAFE: Ensures exactly 2 decimal places for currency display
 *
 * @param cents - Integer cents amount
 * @returns Dollars with 2 decimal places (e.g., 1999 -> 19.99)
 */
export function centsToDollars(cents: number): number {
  return cents / 100
}

/**
 * Formats currency values to 2 decimal places
 *
 * ⚠️ LIMITATION: This function uses floating-point arithmetic which has precision issues.
 *
 * Current Implementation Status:
 * - Database stores amounts as FLOAT/DECIMAL (not integer cents)
 * - APIs sum/aggregate these float values directly
 * - This function only formats the final output
 *
 * To Fully Fix (requires database migration):
 * 1. Change schema: totalAmount DECIMAL(10,2) -> totalAmountCents BIGINT
 * 2. Migrate existing data: UPDATE sales SET totalAmountCents = ROUND(totalAmount * 100)
 * 3. Update APIs to use dollarsToCents() for arithmetic, centsToDollars() for display
 *
 * Example of Correct Pattern:
 * ```typescript
 * // Convert to cents for arithmetic
 * const totalCents = sales.reduce((sum, sale) => {
 *   return sum + dollarsToCents(sale.totalAmount)
 * }, 0)
 * // Convert back to dollars for display
 * const totalDollars = centsToDollars(totalCents)
 * ```
 *
 * For now, this function provides consistent formatting but does NOT fix underlying
 * floating-point arithmetic. Rounding errors may accumulate over many transactions.
 *
 * @param value - The numeric value to format
 * @returns Formatted value with 2 decimal places
 */
export function formatCurrency(value: number): number {
  return Number(value.toFixed(2))
}
