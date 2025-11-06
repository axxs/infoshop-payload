/**
 * URL Validation Utility
 * Validates URLs to prevent SSRF attacks
 *
 * @module lib/urlValidator
 */

/**
 * Blocklisted IP ranges and hostnames to prevent SSRF
 */
const BLOCKLISTED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS metadata service
  'metadata.google.internal', // GCP metadata service
]

/**
 * Private IP ranges (RFC 1918)
 */
const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^fc00:/i, // IPv6 unique local
  /^fe80:/i, // IPv6 link-local
]

/**
 * Validates a URL for security issues
 *
 * @param url - URL to validate
 * @returns Object with valid status and optional error message
 */
export function validateURL(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url)

    // 1. Must be HTTPS only
    if (parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: 'Only HTTPS URLs are allowed',
      }
    }

    // 2. Check for blocklisted hosts
    const hostname = parsed.hostname.toLowerCase()
    if (BLOCKLISTED_HOSTS.includes(hostname)) {
      return {
        valid: false,
        error: 'Blocklisted hostname',
      }
    }

    // 3. Check for private IP ranges
    for (const range of PRIVATE_IP_RANGES) {
      if (range.test(hostname)) {
        return {
          valid: false,
          error: 'Private IP addresses are not allowed',
        }
      }
    }

    // 4. Check for IP address format (basic check)
    const isIPv4 = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
    const isIPv6 = hostname.includes(':')

    if (isIPv4 || isIPv6) {
      // Allow public IPs but block private ones (already checked above)
      // Additional validation could be added here
    }

    return { valid: true }
  } catch (_error) {
    return {
      valid: false,
      error: 'Invalid URL format',
    }
  }
}

/**
 * Validates and sanitizes a URL for use in image downloads
 *
 * @param url - URL to validate
 * @returns Validated URL or null if invalid
 */
export function validateImageURL(url: string): string | null {
  const validation = validateURL(url)

  if (!validation.valid) {
    return null
  }

  return url
}
