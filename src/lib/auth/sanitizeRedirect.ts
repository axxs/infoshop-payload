/**
 * Sanitize a redirect URL to prevent open redirect attacks.
 * Only allows relative paths starting with '/' (rejects protocol-relative URLs like '//evil.com').
 *
 * @param url - The redirect URL from user input (e.g. query parameter).
 * @param fallback - Fallback path when the URL is missing or invalid. Defaults to '/account'.
 * @returns A safe relative path, or the fallback.
 */
export function sanitizeRedirect(url: string | undefined, fallback = '/account'): string {
  if (!url) return fallback
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url
  }
  return fallback
}
