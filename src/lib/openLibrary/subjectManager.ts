/**
 * Subject Manager
 * Handles finding or creating Subject records and linking them to books
 *
 * @module openLibrary/subjectManager
 */

import type { Payload } from 'payload'
import type { Subject } from '@/payload-types'

/**
 * Result of finding or creating a subject
 */
interface SubjectResult {
  id: number
  name: string
  slug: string
  created: boolean
}

/**
 * Options for subject operations
 */
interface SubjectManagerOptions {
  /** Maximum number of subjects to process in a single operation */
  maxSubjects?: number
  /** Whether to skip subjects that are too generic */
  skipGeneric?: boolean
}

/**
 * Generic subject names to skip (too broad to be useful)
 */
const GENERIC_SUBJECTS = new Set([
  'fiction',
  'non-fiction',
  'nonfiction',
  'literature',
  'books',
  'reading',
  'general',
  'other',
  'miscellaneous',
])

/**
 * Normalizes a subject name for comparison
 *
 * @param name - Raw subject name
 * @returns Normalized subject name
 */
function normalizeSubjectName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters except hyphens
    .replace(/\s+/g, ' ') // Collapse multiple spaces
}

/**
 * Generates a URL-friendly slug from a subject name
 *
 * @param name - Subject name
 * @returns URL-friendly slug
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Checks if a subject name is too generic to be useful
 *
 * @param name - Subject name to check
 * @returns True if the subject is generic
 */
function isGenericSubject(name: string): boolean {
  const normalized = normalizeSubjectName(name)
  return GENERIC_SUBJECTS.has(normalized)
}

/**
 * Finds an existing subject by name (case-insensitive)
 *
 * Uses indexed normalizedName field for efficient case-insensitive lookups
 *
 * @param payload - Payload instance
 * @param name - Subject name to search for
 * @returns Subject if found, null otherwise
 */
async function findExistingSubject(payload: Payload, name: string): Promise<Subject | null> {
  const normalized = normalizeSubjectName(name)

  try {
    // Use indexed normalizedName field for efficient case-insensitive search
    const result = await payload.find({
      collection: 'subjects',
      where: {
        normalizedName: {
          equals: normalized,
        },
      },
      limit: 1,
    })

    if (result.docs.length > 0) {
      return result.docs[0]
    }

    return null
  } catch (error) {
    payload.logger.error({
      msg: 'Failed to search for existing subject',
      name,
      normalized,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Creates a new subject record
 *
 * @param payload - Payload instance
 * @param name - Subject name
 * @returns Created subject
 */
async function createSubject(payload: Payload, name: string): Promise<Subject> {
  const slug = generateSlug(name)
  const normalized = normalizeSubjectName(name)

  try {
    const subject = await payload.create({
      collection: 'subjects',
      draft: false,
      data: {
        name: name.trim(),
        slug,
        normalizedName: normalized,
      },
    })

    payload.logger.info({
      msg: 'Created new subject',
      name: subject.name,
      slug: subject.slug,
      id: subject.id,
    })

    return subject
  } catch (error) {
    payload.logger.error({
      msg: 'Failed to create subject',
      name,
      slug,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Finds or creates a subject by name
 *
 * Handles race conditions by catching duplicate key errors and retrying find
 *
 * @param payload - Payload instance
 * @param name - Subject name
 * @returns Subject result with ID and creation status
 */
export async function findOrCreateSubject(payload: Payload, name: string): Promise<SubjectResult> {
  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new Error('Subject name cannot be empty')
  }

  // Check if subject already exists
  const existing = await findExistingSubject(payload, trimmedName)

  if (existing) {
    return {
      id: existing.id,
      name: existing.name,
      slug: existing.slug,
      created: false,
    }
  }

  // Try to create new subject
  try {
    const newSubject = await createSubject(payload, trimmedName)

    return {
      id: newSubject.id,
      name: newSubject.name,
      slug: newSubject.slug,
      created: true,
    }
  } catch (error) {
    // If duplicate key error (race condition), retry finding the subject
    const errorMessage = error instanceof Error ? error.message : ''
    if (errorMessage.includes('duplicate') || errorMessage.includes('unique constraint')) {
      payload.logger.warn({
        msg: 'Race condition detected in subject creation, retrying find',
        name: trimmedName,
      })

      const retryExisting = await findExistingSubject(payload, trimmedName)
      if (retryExisting) {
        return {
          id: retryExisting.id,
          name: retryExisting.name,
          slug: retryExisting.slug,
          created: false,
        }
      }
    }

    // Re-throw if not a duplicate error or retry failed
    throw error
  }
}

/**
 * Processes multiple subject names and returns their IDs
 *
 * @param payload - Payload instance
 * @param subjectNames - Array of subject names from Open Library
 * @param options - Processing options
 * @returns Array of subject IDs ready for linking
 */
export async function processSubjects(
  payload: Payload,
  subjectNames: string[],
  options: SubjectManagerOptions = {},
): Promise<number[]> {
  const { maxSubjects = 10, skipGeneric = true } = options

  if (!subjectNames || subjectNames.length === 0) {
    return []
  }

  // Filter and limit subjects
  let filteredSubjects = subjectNames.map((name) => name.trim()).filter((name) => name.length > 0)

  if (skipGeneric) {
    filteredSubjects = filteredSubjects.filter((name) => !isGenericSubject(name))
  }

  // Limit number of subjects to process
  filteredSubjects = filteredSubjects.slice(0, maxSubjects)

  if (filteredSubjects.length === 0) {
    payload.logger.warn({
      msg: 'No valid subjects to process after filtering',
      originalCount: subjectNames.length,
    })
    return []
  }

  // Process each subject
  const results: SubjectResult[] = []
  const errors: Array<{ name: string; error: string }> = []

  for (const name of filteredSubjects) {
    try {
      const result = await findOrCreateSubject(payload, name)
      results.push(result)
    } catch (error) {
      errors.push({
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      payload.logger.error({
        msg: 'Failed to process subject',
        name,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Log summary
  const createdCount = results.filter((r) => r.created).length
  const existingCount = results.filter((r) => !r.created).length

  payload.logger.info({
    msg: 'Processed subjects',
    total: results.length,
    created: createdCount,
    existing: existingCount,
    errors: errors.length,
    skipped: subjectNames.length - filteredSubjects.length,
  })

  if (errors.length > 0) {
    payload.logger.warn({
      msg: 'Some subjects failed to process',
      errors,
    })
  }

  return results.map((r) => r.id)
}

/**
 * Links subjects to a book
 *
 * @param payload - Payload instance
 * @param bookId - Book ID
 * @param subjectIds - Array of subject IDs to link
 * @returns Updated book
 */
export async function linkSubjectsToBook(
  payload: Payload,
  bookId: number,
  subjectIds: number[],
): Promise<void> {
  if (subjectIds.length === 0) {
    return
  }

  try {
    await payload.update({
      collection: 'books',
      id: bookId,
      data: {
        subjects: subjectIds,
      },
    })

    payload.logger.info({
      msg: 'Linked subjects to book',
      bookId,
      subjectCount: subjectIds.length,
    })
  } catch (error) {
    payload.logger.error({
      msg: 'Failed to link subjects to book',
      bookId,
      subjectIds,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Complete workflow: process subject names from Open Library and link to book
 *
 * @param payload - Payload instance
 * @param bookId - Book ID to link subjects to
 * @param subjectNames - Subject names from Open Library API
 * @param options - Processing options
 * @returns Number of subjects linked
 */
export async function processAndLinkSubjects(
  payload: Payload,
  bookId: number,
  subjectNames: string[],
  options: SubjectManagerOptions = {},
): Promise<number> {
  const subjectIds = await processSubjects(payload, subjectNames, options)

  if (subjectIds.length > 0) {
    await linkSubjectsToBook(payload, bookId, subjectIds)
  }

  return subjectIds.length
}
