/**
 * Sanitize a redirect URL to prevent open redirect attacks.
 * Only allows relative paths starting with '/' (rejects protocol-relative URLs like '//evil.com').
 */
export function sanitizeRedirect(url: string | undefined, fallback = '/account'): string {
  if (!url) return fallback
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url
  }
  return fallback
}
