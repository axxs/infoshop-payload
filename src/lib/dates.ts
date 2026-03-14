/**
 * Format a date string for display.
 * Uses en-AU locale for day-month-year ordering.
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
