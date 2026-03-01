'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { getSquareConfigStatus } from '../actions/getSquareConfigStatus'
import type { SquareConfigStatusData } from '../actions/getSquareConfigStatus'

function StatusIcon({ ok }: { ok: boolean }) {
  if (ok) {
    return (
      <CheckCircle
        className="mr-1.5 inline-block h-4 w-4 text-green-600"
        aria-label="Configured"
      />
    )
  }
  return (
    <XCircle className="mr-1.5 inline-block h-4 w-4 text-red-600" aria-label="Not configured" />
  )
}

export function SquareConfigStatus() {
  const [status, setStatus] = useState<SquareConfigStatusData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getSquareConfigStatus()
      .then(setStatus)
      .catch(() => setError('Failed to load Square configuration status'))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4">
        <p className="m-0 text-sm text-red-600">{error}</p>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <p className="m-0 text-sm text-gray-500">Loading configuration status...</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-center gap-3">
        <strong className="text-sm">Square Environment:</strong>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase text-white ${
            status.environment === 'production' ? 'bg-green-600' : 'bg-orange-500'
          }`}
        >
          {status.environment}
        </span>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <div>
          <StatusIcon ok={status.hasAccessToken} />
          <span>SQUARE_ACCESS_TOKEN</span>
        </div>
        <div>
          <StatusIcon ok={status.hasApplicationId} />
          <span>
            SQUARE_APPLICATION_ID
            {status.applicationIdPrefix && (
              <span className="ml-2 text-xs text-gray-500">({status.applicationIdPrefix})</span>
            )}
          </span>
        </div>
        <div>
          <StatusIcon ok={status.hasLocationId} />
          <span>SQUARE_LOCATION_ID</span>
        </div>
        <div>
          <StatusIcon ok={status.hasSyncApiKey} />
          <span>SQUARE_SYNC_API_KEY</span>
          <span className="ml-2 text-xs text-gray-500">(optional)</span>
        </div>
      </div>

      <div
        className={`mt-4 rounded-md border p-2.5 text-sm font-semibold ${
          status.isReady
            ? 'border-green-600 bg-green-50 text-green-700'
            : 'border-red-500 bg-red-50 text-red-600'
        }`}
      >
        {status.isReady
          ? 'Square is configured and ready to accept payments'
          : 'Square is not fully configured \u2014 payments will fail'}
      </div>
    </div>
  )
}
