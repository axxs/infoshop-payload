/**
 * Book Lookup Configuration
 *
 * Centralised configuration for all book lookup sources.
 * Modify these values to adjust timeout, cache behavior, and retry logic.
 *
 * @module bookLookup/config
 */

/**
 * API timeout configuration
 */
export const TIMEOUT = {
  /** Google Books API timeout in milliseconds */
  GOOGLE_BOOKS: 5000,
  /** Open Library API timeout in milliseconds */
  OPEN_LIBRARY: 10000,
  /** WorldCat Classify API timeout in milliseconds */
  WORLDCAT: 5000,
} as const

/**
 * Cache configuration
 */
export const CACHE = {
  /** Maximum cache entries per source (reduced from 1000 to save memory) */
  MAX_SIZE: 250,
  /** Cache TTL in milliseconds (24 hours) */
  TTL: 24 * 60 * 60 * 1000,
} as const

/**
 * Retry and fallback configuration
 */
export const RETRY = {
  /** Maximum number of retry attempts for failed API calls */
  MAX_ATTEMPTS: 3,
  /** Delay between retries in milliseconds */
  RETRY_DELAY: 1000,
} as const

/**
 * Title search match thresholds (Dice coefficient, 0.0–1.0)
 */
export const TITLE_SEARCH = {
  /** Minimum similarity score for title match */
  TITLE_THRESHOLD: 0.65,
  /** Minimum similarity score for author match */
  AUTHOR_THRESHOLD: 0.55,
} as const

/**
 * Feature flags
 */
export const FEATURES = {
  /** Enable structured logging for ISBN lookups */
  STRUCTURED_LOGGING: true,
  /** Log successful lookups (not just errors) */
  LOG_SUCCESSES: true,
  /** Log cache hits for debugging */
  LOG_CACHE_HITS: false,
} as const
