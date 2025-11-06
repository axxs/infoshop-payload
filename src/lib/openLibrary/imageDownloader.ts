/**
 * Cover Image Downloader
 * Downloads book cover images from Open Library and stores them in Payload Media
 *
 * @module openLibrary/imageDownloader
 */

import type { Payload } from 'payload'
import type { Media } from '@/payload-types'

/**
 * Result of downloading and storing a cover image
 */
interface DownloadImageResult {
  success: boolean
  mediaId?: number
  filename?: string
  error?: string
}

/**
 * Options for image download
 */
interface DownloadImageOptions {
  /** Timeout for image download in milliseconds */
  timeout?: number
  /** Alt text for the image */
  alt?: string
  /** Book title for generating filename */
  bookTitle?: string
}

/**
 * Generates a filename from book title and ISBN
 *
 * @param bookTitle - Book title
 * @param isbn - ISBN for uniqueness
 * @returns Safe filename
 */
function generateFilename(bookTitle: string | undefined, isbn: string | undefined): string {
  const timestamp = Date.now()

  if (bookTitle) {
    // Clean title: lowercase, alphanumeric + hyphens only
    const cleanTitle = bookTitle
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50) // Limit length

    return `${cleanTitle}-${timestamp}.jpg`
  }

  if (isbn) {
    return `isbn-${isbn}-${timestamp}.jpg`
  }

  return `book-cover-${timestamp}.jpg`
}

/**
 * Downloads an image from a URL and returns the buffer
 *
 * @param url - Image URL to download
 * @param timeout - Download timeout in milliseconds
 * @returns Image buffer
 */
async function downloadImageBuffer(url: string, timeout: number = 30000): Promise<Buffer> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Infoshop-Payload/1.0 (Bookstore Inventory System)',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.startsWith('image/')) {
      throw new Error(`Invalid content type: ${contentType}. Expected an image.`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Downloads a cover image and creates a Media record in Payload
 *
 * @param payload - Payload instance
 * @param imageUrl - URL of the cover image
 * @param options - Download options
 * @returns Download result with Media ID
 *
 * @example
 * ```typescript
 * const result = await downloadCoverImage(payload, 'https://covers.openlibrary.org/b/id/123-L.jpg', {
 *   bookTitle: 'Fantastic Mr. Fox',
 *   alt: 'Cover of Fantastic Mr. Fox'
 * })
 * if (result.success) {
 *   console.log(`Media ID: ${result.mediaId}`)
 * }
 * ```
 */
export async function downloadCoverImage(
  payload: Payload,
  imageUrl: string,
  options: DownloadImageOptions = {},
): Promise<DownloadImageResult> {
  const { timeout = 30000, alt, bookTitle } = options

  try {
    // Validate URL
    if (!imageUrl || typeof imageUrl !== 'string') {
      return {
        success: false,
        error: 'Invalid image URL provided',
      }
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(imageUrl)
    } catch {
      return {
        success: false,
        error: `Invalid URL format: ${imageUrl}`,
      }
    }

    // Only allow HTTPS for security
    if (parsedUrl.protocol !== 'https:') {
      return {
        success: false,
        error: 'Only HTTPS URLs are allowed for security reasons',
      }
    }

    // Download image
    payload.logger.info({
      msg: 'Downloading cover image',
      url: imageUrl,
      bookTitle,
    })

    const imageBuffer = await downloadImageBuffer(imageUrl, timeout)

    // Generate filename
    const filename = generateFilename(bookTitle, undefined)

    // Create Media record in Payload
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: alt || (bookTitle ? `Cover of ${bookTitle}` : 'Book cover'),
      },
      file: {
        data: imageBuffer,
        mimetype: 'image/jpeg',
        name: filename,
        size: imageBuffer.length,
      },
    })

    payload.logger.info({
      msg: 'Cover image downloaded and stored',
      mediaId: media.id,
      filename: media.filename,
      size: imageBuffer.length,
    })

    return {
      success: true,
      mediaId: media.id,
      filename: media.filename || filename,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during image download'

    payload.logger.error({
      msg: 'Failed to download cover image',
      url: imageUrl,
      error: errorMessage,
    })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Downloads cover image if URL is provided, returns null if not
 *
 * @param payload - Payload instance
 * @param imageUrl - Optional image URL
 * @param options - Download options
 * @returns Media ID or null
 */
export async function downloadCoverImageIfPresent(
  payload: Payload,
  imageUrl: string | undefined,
  options: DownloadImageOptions = {},
): Promise<number | null> {
  if (!imageUrl) {
    return null
  }

  const result = await downloadCoverImage(payload, imageUrl, options)
  return result.success ? result.mediaId || null : null
}
