/**
 * Server Actions for Open Library Integration
 * Provides server-side functions callable from client components
 *
 * @module openLibrary/actions
 */

'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { processAndLinkSubjects } from './subjectManager'
import { downloadBestCoverImage, downloadCoverImageIfPresent } from './imageDownloader'

/**
 * Result of processing subjects for a book
 */
interface ProcessSubjectsResult {
  success: boolean
  subjectsLinked?: number
  error?: string
}

/**
 * Result of downloading cover image
 */
interface DownloadCoverResult {
  success: boolean
  mediaId?: number
  error?: string
}

/**
 * Server action to process and link subjects to a book
 *
 * @param bookId - Book ID to link subjects to
 * @param subjectNames - Array of subject names from Open Library
 * @returns Result with success status and count of linked subjects
 *
 * @example
 * ```typescript
 * const result = await processBookSubjects(123, ['Science Fiction', 'Space Opera'])
 * if (result.success) {
 *   console.log(`Linked ${result.subjectsLinked} subjects`)
 * }
 * ```
 */
export async function processBookSubjects(
  bookId: number,
  subjectNames: string[],
): Promise<ProcessSubjectsResult> {
  try {
    const payload = await getPayload({ config })

    const subjectsLinked = await processAndLinkSubjects(payload, bookId, subjectNames, {
      maxSubjects: 10,
      skipGeneric: true,
    })

    return {
      success: true,
      subjectsLinked,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process subjects',
    }
  }
}

/**
 * Server action to download and store a book cover image.
 *
 * When an ISBN is provided, uses the multi-source cover waterfall
 * (OL CDN, Google Books fife variant, longitood.com) so a real cover
 * is found even if the metadata URL is a placeholder or missing.
 *
 * @param coverImageUrl - Cover URL from the metadata lookup (may be undefined)
 * @param bookTitle     - Book title for filename generation
 * @param isbn          - Optional ISBN; enables fallback cover sources
 * @returns Result with success status and Media ID
 *
 * @example
 * ```typescript
 * const result = await downloadBookCover(
 *   'https://books.google.com/...',
 *   'Fantastic Mr. Fox',
 *   '9780142410349',
 * )
 * if (result.success) console.log(`Media ID: ${result.mediaId}`)
 * ```
 */
export async function downloadBookCover(
  coverImageUrl: string | undefined,
  bookTitle: string,
  isbn?: string,
): Promise<DownloadCoverResult> {
  try {
    const payload = await getPayload({ config })

    let mediaId: number | null

    if (isbn) {
      // Use the multi-source waterfall when an ISBN is available
      mediaId = await downloadBestCoverImage(payload, {
        isbn,
        existingCoverUrl: coverImageUrl,
        bookTitle,
        alt: `Cover of ${bookTitle}`,
      })
    } else {
      // No ISBN — try the metadata URL only
      mediaId = await downloadCoverImageIfPresent(payload, coverImageUrl, {
        bookTitle,
        alt: `Cover of ${bookTitle}`,
      })
    }

    if (mediaId === null) {
      return {
        success: false,
        error: 'No suitable cover image found',
      }
    }

    return {
      success: true,
      mediaId,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download cover image',
    }
  }
}
