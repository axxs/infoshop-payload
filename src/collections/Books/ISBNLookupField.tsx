'use client'

/**
 * Custom ISBN Lookup Field Component
 * Provides an ISBN input with a lookup button that auto-populates book data from Open Library
 *
 * @remarks
 * This component integrates with the Open Library API to fetch book metadata.
 * It provides real-time validation and user feedback during the lookup process.
 *
 * @example
 * ```typescript
 * // In collection config:
 * {
 *   name: 'isbn',
 *   type: 'text',
 *   admin: {
 *     components: {
 *       Field: '@/collections/Books/ISBNLookupField#ISBNLookupField',
 *     },
 *   },
 * }
 * ```
 */

import React, { useState } from 'react'
import { TextInput, useField, useForm, Button } from '@payloadcms/ui'

/**
 * API response structure from ISBN lookup endpoint
 */
interface ISBNLookupResponse {
  success: boolean
  error?: string
  data?: {
    title?: string
    author?: string
    publisher?: string
    publishedDate?: string
    pages?: number
    description?: string
    externalCoverUrl?: string
  }
  source?: string
}

/**
 * Props for ISBNLookupField component
 */
interface ISBNLookupFieldProps {
  /** The field path in the Payload form */
  path: string
}

/**
 * Custom field component for ISBN lookup with auto-population
 *
 * @param props - Component props
 * @returns React component
 */
export const ISBNLookupField = ({ path }: ISBNLookupFieldProps): React.JSX.Element => {
  const { value, setValue } = useField<string>({ path })
  const { dispatchFields } = useForm()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  /**
   * Handles the ISBN lookup and form field population
   */
  const handleLookup = async (): Promise<void> => {
    if (!value || value.trim().length === 0) {
      setError('Please enter an ISBN first')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/books/lookup-isbn?isbn=${encodeURIComponent(value)}`)

      // Check HTTP status before parsing
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP ${response.status}: ${response.statusText}`,
        }))
        setError(errorData.error || `Server error: ${response.status}`)
        return
      }

      const result: ISBNLookupResponse = await response.json()

      if (!result.success) {
        setError(result.error || 'Book not found')
        return
      }

      const bookData = result.data

      if (!bookData) {
        setError('No book data returned from API')
        return
      }

      // Build field updates object
      const fieldsToUpdate: Record<string, unknown> = {}

      if (bookData.title) fieldsToUpdate.title = bookData.title
      if (bookData.author) fieldsToUpdate.author = bookData.author
      if (bookData.publisher) fieldsToUpdate.publisher = bookData.publisher
      if (bookData.publishedDate) fieldsToUpdate.publishedDate = bookData.publishedDate
      if (bookData.pages) fieldsToUpdate.pages = bookData.pages
      if (bookData.description) fieldsToUpdate.description = bookData.description
      if (bookData.externalCoverUrl) fieldsToUpdate.externalCoverUrl = bookData.externalCoverUrl

      // Dispatch all field updates with error handling
      try {
        Object.entries(fieldsToUpdate).forEach(([fieldPath, fieldValue]) => {
          dispatchFields({
            type: 'UPDATE',
            path: fieldPath,
            value: fieldValue,
          })
        })

        setSuccess(
          `Found: ${bookData.title || 'Unknown'} by ${bookData.author || 'Unknown'} - Auto-populated ${Object.keys(fieldsToUpdate).length} fields`,
        )
      } catch (dispatchError) {
        setError(
          `Failed to update form fields: ${dispatchError instanceof Error ? dispatchError.message : 'Unknown error'}`,
        )
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : 'Failed to connect to API'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mb-5">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <TextInput
            path={path}
            label="ISBN"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
            description="ISBN-10 or ISBN-13"
          />
        </div>
        <Button
          onClick={handleLookup}
          disabled={isLoading || !value}
          buttonStyle="primary"
          size="medium"
          type="button"
        >
          {isLoading ? 'Looking up...' : 'Look up Book'}
        </Button>
      </div>

      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-600 text-sm">
          ✓ {success}
        </div>
      )}
    </div>
  )
}
