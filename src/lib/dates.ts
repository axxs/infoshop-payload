/**
 * Format a date string for display.
 * Uses en-AU locale for day-month-year ordering.
 */
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
