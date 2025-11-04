/**
 * Tax Calculation Service
 * Handles tax rate calculations based on currency and region
 */

export interface TaxCalculationResult {
  taxRate: number
  taxAmount: number
  totalWithTax: number
  taxDescription: string
}

/**
 * Tax rates by currency/region
 * TODO: Replace with database-driven configuration or tax API integration (Stripe Tax, TaxJar)
 */
const TAX_RATES: Record<string, { rate: number; description: string }> = {
  AUD: { rate: 0.1, description: 'GST (10%)' },
  USD: { rate: 0.0, description: 'No sales tax (varies by state)' },
  EUR: { rate: 0.0, description: 'VAT (varies by country)' },
  GBP: { rate: 0.2, description: 'VAT (20%)' },
}

/**
 * Calculate tax for a given subtotal and currency
 *
 * @param subtotal - The subtotal amount before tax
 * @param currency - The currency code (AUD, USD, EUR, GBP)
 * @returns Tax calculation result with rate, amount, and total
 */
export function calculateTax(subtotal: number, currency: string): TaxCalculationResult {
  const taxConfig = TAX_RATES[currency] || { rate: 0.0, description: 'No tax configured' }

  const taxRate = taxConfig.rate
  const taxAmount = subtotal * taxRate
  const totalWithTax = subtotal + taxAmount

  return {
    taxRate,
    taxAmount,
    totalWithTax,
    taxDescription: taxConfig.description,
  }
}

/**
 * Get tax rate for a currency
 *
 * @param currency - The currency code
 * @returns The tax rate (0.0 to 1.0)
 */
export function getTaxRate(currency: string): number {
  return TAX_RATES[currency]?.rate || 0.0
}

/**
 * Check if tax applies for a currency
 *
 * @param currency - The currency code
 * @returns True if tax applies, false otherwise
 */
export function hasTax(currency: string): boolean {
  return getTaxRate(currency) > 0
}

/**
 * Format tax rate as percentage
 *
 * @param currency - The currency code
 * @returns Formatted tax rate (e.g., "10%")
 */
export function formatTaxRate(currency: string): string {
  const rate = getTaxRate(currency)
  return `${(rate * 100).toFixed(0)}%`
}
