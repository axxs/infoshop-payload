'use client'

/**
 * CSV Import Button Component
 * Provides UI for uploading and importing books via CSV
 *
 * @module collections/Books/CSVImportButton
 */

import React, { useState } from 'react'
import { Button } from '@payloadcms/ui'
import type { PreviewResult, CSVImportOptions, ValidationSeverity } from '@/lib/csv/types'
import { DuplicateStrategy } from '@/lib/csv/types'

/**
 * CSV Import Modal Component
 */
export const CSVImportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>('')

  // Import options
  const [options, setOptions] = useState<CSVImportOptions>({
    duplicateStrategy: DuplicateStrategy.WARN,
    autoCreateCategories: true,
    autoCreateSubjects: true,
    autoPopulateFromISBN: true, // Enable by default for ISBN-only imports
    downloadCoverImages: true,
    defaultCurrency: 'USD',
    batchSize: 10,
    continueWithErrors: false,
  })

  /**
   * Downloads the CSV template
   */
  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch('/api/books/csv-import/template')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'books-import-template.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError('Failed to download template')
    }
  }

  /**
   * Handles file selection
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreview(null)
      setError(null)
      setSuccess(null)
    }
  }

  /**
   * Previews the CSV file
   */
  const handlePreview = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setIsLoading(true)
    setError(null)
    setProgress('Validating CSV...')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('options', JSON.stringify(options))

      const response = await fetch('/api/books/csv-import/preview', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to preview CSV')
        return
      }

      setPreview(result.preview)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to preview CSV')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Skips preview and imports directly, continuing past any errors
   */
  const handleDirectImport = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setIsLoading(true)
    setError(null)
    setProgress('Importing books (skipping invalid rows)...')

    try {
      // Step 1: Preview to get validated operations
      const formData = new FormData()
      formData.append('file', file)
      formData.append('options', JSON.stringify({ ...options, continueWithErrors: true }))

      const previewResponse = await fetch('/api/books/csv-import/preview', {
        method: 'POST',
        body: formData,
      })

      const previewResult = await previewResponse.json()

      if (!previewResponse.ok || !previewResult.success) {
        setError(previewResult.error || 'Failed to validate CSV')
        return
      }

      setProgress(
        `Validated ${previewResult.preview.validOperations} books. Importing...`,
      )

      // Step 2: Execute immediately
      const executeResponse = await fetch('/api/books/csv-import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preview: previewResult.preview,
          options: { ...options, continueWithErrors: true },
        }),
      })

      const executeResult = await executeResponse.json()

      if (!executeResponse.ok || !executeResult.success) {
        setError(executeResult.error || 'Failed to execute import')
        return
      }

      const { result: execution } = executeResult
      setSuccess(
        `Import complete! Created: ${execution.createdBookIds.length}, Updated: ${execution.updatedBookIds.length}, Failed: ${execution.failed}, Skipped: ${execution.skipped}`,
      )
      setProgress('')
      setPreview(null)
      setFile(null)

      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Executes the import
   */
  const handleExecute = async () => {
    if (!preview) {
      setError('Please preview the CSV first')
      return
    }

    if (preview.hasErrors && !options.continueWithErrors) {
      setError(
        'Cannot import CSV with validation errors. Fix errors or enable "Continue with errors" to skip invalid rows.',
      )
      return
    }

    setIsLoading(true)
    setError(null)
    setProgress('Importing books...')

    try {
      const response = await fetch('/api/books/csv-import/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preview,
          options,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to execute import')
        return
      }

      const { result: execution } = result
      setSuccess(
        `Import complete! Created: ${execution.createdBookIds.length}, Updated: ${execution.updatedBookIds.length}, Failed: ${execution.failed}, Skipped: ${execution.skipped}`,
      )
      setProgress('')
      setPreview(null)
      setFile(null)

      // Reload page after 2 seconds to show new books
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute import')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Downloads error report as CSV
   */
  const handleDownloadErrors = async () => {
    if (!preview || preview.invalidOperations === 0) return

    try {
      const response = await fetch('/api/books/csv-import/error-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preview }),
      })

      if (!response.ok) {
        setError('Failed to generate error report')
        return
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `import-errors-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (_err) {
      setError('Failed to download error report')
    }
  }

  /**
   * Gets severity color class
   */
  const getSeverityColor = (severity: ValidationSeverity): string => {
    switch (severity) {
      case 'ERROR':
        return 'text-red-600'
      case 'WARNING':
        return 'text-yellow-600'
      case 'INFO':
        return 'text-blue-600'
      default:
        return ''
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} buttonStyle="secondary" size="medium" type="button">
        Import CSV
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Import Books from CSV</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-500 hover:text-gray-700"
            type="button"
          >
            ✕
          </button>
        </div>

        {/* Template Download */}
        <div className="mb-6">
          <Button
            onClick={handleDownloadTemplate}
            buttonStyle="secondary"
            size="small"
            type="button"
          >
            Download CSV Template
          </Button>
        </div>

        {/* File Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select CSV File</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && <p className="mt-2 text-sm text-gray-600">Selected: {file.name}</p>}
        </div>

        {/* Options */}
        <div className="mb-6 border-t pt-4">
          <h3 className="font-semibold mb-3">Import Options</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.autoCreateCategories}
                onChange={(e) => setOptions({ ...options, autoCreateCategories: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Auto-create categories</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.autoCreateSubjects}
                onChange={(e) => setOptions({ ...options, autoCreateSubjects: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Auto-create subjects</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.autoPopulateFromISBN}
                onChange={(e) => setOptions({ ...options, autoPopulateFromISBN: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Auto-populate from ISBN lookup</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.downloadCoverImages}
                onChange={(e) => setOptions({ ...options, downloadCoverImages: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Download cover images</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={options.continueWithErrors}
                onChange={(e) => setOptions({ ...options, continueWithErrors: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm">Continue with errors (skip invalid rows)</span>
            </label>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Duplicate Strategy</label>
            <select
              value={options.duplicateStrategy}
              onChange={(e) =>
                setOptions({ ...options, duplicateStrategy: e.target.value as DuplicateStrategy })
              }
              className="block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value={DuplicateStrategy.WARN}>Warn (create anyway)</option>
              <option value={DuplicateStrategy.SKIP}>Skip duplicates</option>
              <option value={DuplicateStrategy.UPDATE}>Update existing</option>
              <option value={DuplicateStrategy.ERROR}>Error (block import)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-3">
          <Button
            onClick={handlePreview}
            disabled={!file || isLoading}
            buttonStyle="secondary"
            size="medium"
            type="button"
          >
            {isLoading ? 'Processing...' : 'Preview Import'}
          </Button>
          <Button
            onClick={handleDirectImport}
            disabled={!file || isLoading}
            buttonStyle="primary"
            size="medium"
            type="button"
          >
            {isLoading ? 'Importing...' : 'Import Now'}
          </Button>
        </div>

        {/* Progress */}
        {progress && !error && !success && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-600 text-sm">
            ⏳ {progress}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-600 text-sm">
            ✓ {success}
          </div>
        )}

        {/* Preview Results */}
        {preview && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Preview Results</h3>

            {/* Statistics */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold">{preview.totalOperations}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{preview.validOperations}</div>
                <div className="text-sm text-gray-600">Valid</div>
              </div>
              <div className="p-3 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">{preview.invalidOperations}</div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded">
                <div className="text-2xl font-bold text-yellow-600">
                  {preview.issues.filter((i) => i.severity === 'WARNING').length}
                </div>
                <div className="text-sm text-gray-600">Warnings</div>
              </div>
            </div>

            {/* Operations Breakdown */}
            <div className="mb-4">
              <div className="text-sm text-gray-600">
                Create: {preview.operationsByType.create} | Update:{' '}
                {preview.operationsByType.update} | Skip: {preview.operationsByType.skip}
              </div>
            </div>

            {/* Download Errors Button */}
            {preview.invalidOperations > 0 && (
              <div className="mb-4">
                <Button
                  onClick={handleDownloadErrors}
                  buttonStyle="secondary"
                  size="small"
                  type="button"
                >
                  Download Error Report ({preview.invalidOperations} rows)
                </Button>
              </div>
            )}

            {/* Issues List */}
            {preview.issues.length > 0 && (
              <div className="mb-4 max-h-60 overflow-y-auto">
                <h4 className="font-medium mb-2">Validation Issues</h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">Row</th>
                      <th className="p-2 text-left">Field</th>
                      <th className="p-2 text-left">Severity</th>
                      <th className="p-2 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.issues.slice(0, 50).map((issue, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{issue.rowIndex}</td>
                        <td className="p-2">{issue.field}</td>
                        <td className={`p-2 font-medium ${getSeverityColor(issue.severity)}`}>
                          {issue.severity}
                        </td>
                        <td className="p-2">{issue.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.issues.length > 50 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Showing first 50 of {preview.issues.length} issues
                  </p>
                )}
              </div>
            )}

            {/* Execute Button */}
            {(!preview.hasErrors || options.continueWithErrors) && (
              <div className="mt-6">
                {preview.hasErrors && options.continueWithErrors && (
                  <p className="mb-3 text-sm text-orange-600">
                    ⚠️ {preview.invalidOperations} rows with errors will be skipped
                  </p>
                )}
                <Button
                  onClick={handleExecute}
                  disabled={isLoading}
                  buttonStyle="primary"
                  size="medium"
                  type="button"
                >
                  {isLoading ? 'Importing...' : `Import ${preview.validOperations} Books`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
