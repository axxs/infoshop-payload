'use client'

/**
 * Custom ISBN Lookup Field Component
 * Provides an ISBN input with a lookup button that auto-populates book data from Open Library
 */

import React, { useState } from 'react'
import { TextInput, useField, useForm, Button } from '@payloadcms/ui'

export const ISBNLookupField = ({ path }: { path: string }) => {
  const { value, setValue } = useField<string>({ path })
  const { dispatchFields } = useForm()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleLookup = async () => {
    if (!value || value.trim().length === 0) {
      setError('Please enter an ISBN first')
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/books/lookup-isbn?isbn=${encodeURIComponent(value)}`)
      const result = await response.json()

      if (!result.success) {
        setError(result.error || 'Book not found')
        return
      }

      const bookData = result.data

      // Update form fields with fetched data
      const fieldsToUpdate: Record<string, unknown> = {}

      if (bookData.title) fieldsToUpdate.title = bookData.title
      if (bookData.author) fieldsToUpdate.author = bookData.author
      if (bookData.publisher) fieldsToUpdate.publisher = bookData.publisher
      if (bookData.publishedDate) fieldsToUpdate.publishedDate = bookData.publishedDate
      if (bookData.pages) fieldsToUpdate.pages = bookData.pages
      if (bookData.description) fieldsToUpdate.description = bookData.description
      if (bookData.externalCoverUrl) fieldsToUpdate.externalCoverUrl = bookData.externalCoverUrl

      // Dispatch all field updates
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup ISBN')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
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
        <div
          style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#efe',
            border: '1px solid #cfc',
            borderRadius: '4px',
            color: '#363',
          }}
        >
          ✓ {success}
        </div>
      )}
    </div>
  )
}
