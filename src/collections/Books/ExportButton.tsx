'use client'

/**
 * Export Button Component
 * Provides UI for exporting books as JSON or CSV
 *
 * @module collections/Books/ExportButton
 */

import React, { useState } from 'react'
import { Button } from '@payloadcms/ui'

type ExportFormat = 'json' | 'csv'
type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED'

interface ExportFilters {
  format: ExportFormat
  category: string
  subject: string
  stockStatus: StockStatus[]
  search: string
}

/**
 * Export Button Component
 */
export const ExportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<ExportFilters>({
    format: 'json',
    category: '',
    subject: '',
    stockStatus: [],
    search: '',
  })

  /**
   * Handles the export action
   */
  const handleExport = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Build query params
      const params = new URLSearchParams()
      params.set('format', filters.format)

      if (filters.category) {
        params.set('category', filters.category)
      }
      if (filters.subject) {
        params.set('subject', filters.subject)
      }
      if (filters.stockStatus.length > 0) {
        params.set('stockStatus', filters.stockStatus.join(','))
      }
      if (filters.search) {
        params.set('search', filters.search)
      }

      const response = await fetch(`/api/books/export?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Get filename from Content-Disposition header or generate one
      const disposition = response.headers.get('Content-Disposition')
      let filename = `books-export-${Date.now()}.${filters.format}`
      if (disposition) {
        const match = disposition.match(/filename="(.+)"/)
        if (match) {
          filename = match[1]
        }
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setIsOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export books')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Toggles a stock status filter
   */
  const toggleStockStatus = (status: StockStatus) => {
    setFilters((prev) => ({
      ...prev,
      stockStatus: prev.stockStatus.includes(status)
        ? prev.stockStatus.filter((s) => s !== status)
        : [...prev.stockStatus, status],
    }))
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        buttonStyle="secondary"
        size="medium"
        type="button"
        className="ml-2"
      >
        Export Books
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Export Books</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Format Selection */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">Export Format</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="format"
                value="json"
                checked={filters.format === 'json'}
                onChange={() => setFilters({ ...filters, format: 'json' })}
                className="mr-2"
              />
              <span className="text-sm">JSON (full data)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="format"
                value="csv"
                checked={filters.format === 'csv'}
                onChange={() => setFilters({ ...filters, format: 'csv' })}
                className="mr-2"
              />
              <span className="text-sm">CSV (spreadsheet)</span>
            </label>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 border-t pt-4">
          <h3 className="mb-3 font-semibold">Filters (optional)</h3>

          {/* Search */}
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium">Search</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search title, author, or ISBN..."
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Category */}
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium">Category (slug)</label>
            <input
              type="text"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              placeholder="e.g., political-theory"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Subject */}
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium">Subject (slug)</label>
            <input
              type="text"
              value={filters.subject}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
              placeholder="e.g., anarchism"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
            />
          </div>

          {/* Stock Status */}
          <div className="mb-3">
            <label className="mb-1 block text-sm font-medium">Stock Status</label>
            <div className="flex flex-wrap gap-2">
              {(['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED'] as StockStatus[]).map(
                (status) => (
                  <label key={status} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.stockStatus.includes(status)}
                      onChange={() => toggleStockStatus(status)}
                      className="mr-1"
                    />
                    <span className="text-xs">{status.replace('_', ' ')}</span>
                  </label>
                ),
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">Leave empty to export all statuses</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            ❌ {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            onClick={() => setIsOpen(false)}
            buttonStyle="secondary"
            size="medium"
            type="button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isLoading}
            buttonStyle="primary"
            size="medium"
            type="button"
          >
            {isLoading ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
    </div>
  )
}
