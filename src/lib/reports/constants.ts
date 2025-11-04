/**
 * Constants for reporting APIs
 *
 * DATA TRUNCATION POLICY:
 * - All APIs have a MAX_SALES_QUERY_LIMIT to prevent performance issues
 * - When data would be truncated, behavior depends on endpoint type:
 *
 *   JSON APIs (daily-sales, product-sales, revenue):
 *   - Return 200 with warning message and metadata
 *   - Users can see partial data with clear indication it's incomplete
 *   - Designed for dashboards where partial data is better than no data
 *
 *   Export APIs (CSV exports):
 *   - Return 400 error and block the export
 *   - Incomplete CSV files are misleading and dangerous for business decisions
 *   - Users must narrow date range to get complete data
 *   - This ensures exported data is always 100% accurate
 */

// Date range defaults (in days)
export const DEFAULT_DATE_RANGE_DAYS = 30
export const DEFAULT_WEEK_RANGE_DAYS = 84 // 12 weeks
export const DEFAULT_MONTH_RANGE_MONTHS = 12
export const TOP_PRODUCTS_DAYS = 7

// Query limits
export const MAX_SALES_QUERY_LIMIT = 10000
export const DEFAULT_TOP_PRODUCTS_LIMIT = 20
export const MAX_TOP_PRODUCTS_LIMIT = 100

// UI display limits
export const CHART_MAX_VISIBLE_POINTS = 20
export const TOP_PRODUCTS_WIDGET_LIMIT = 5
