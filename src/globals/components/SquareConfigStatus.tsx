'use client'

import { useEffect, useState } from 'react'
import { getSquareConfigStatus } from '../actions/getSquareConfigStatus'
import type { SquareConfigStatusData } from '../actions/getSquareConfigStatus'

function StatusIcon({ ok }: { ok: boolean }) {
  return <span style={{ marginRight: '6px' }}>{ok ? '\u2705' : '\u274c'}</span>
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
      <div style={{ padding: '16px', border: '1px solid #e5484d', borderRadius: '8px', background: '#fff1f0' }}>
        <p style={{ color: '#e5484d', margin: 0 }}>{error}</p>
      </div>
    )
  }

  if (!status) {
    return (
      <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <p style={{ color: '#666', margin: 0 }}>Loading configuration status...</p>
      </div>
    )
  }

  const envBadgeColor = status.environment === 'production' ? '#30a46c' : '#f76b15'

  return (
    <div style={{ padding: '16px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <strong>Square Environment:</strong>
        <span
          style={{
            background: envBadgeColor,
            color: 'white',
            padding: '2px 10px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          {status.environment}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div>
          <StatusIcon ok={status.hasAccessToken} />
          <span>SQUARE_ACCESS_TOKEN</span>
        </div>
        <div>
          <StatusIcon ok={status.hasApplicationId} />
          <span>
            SQUARE_APPLICATION_ID
            {status.applicationIdPrefix && (
              <span style={{ color: '#666', marginLeft: '8px', fontSize: '13px' }}>
                ({status.applicationIdPrefix})
              </span>
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
          <span style={{ color: '#666', marginLeft: '8px', fontSize: '13px' }}>(optional)</span>
        </div>
      </div>

      <div
        style={{
          marginTop: '16px',
          padding: '10px 14px',
          borderRadius: '6px',
          background: status.isReady ? '#e6f6eb' : '#fff1f0',
          border: `1px solid ${status.isReady ? '#30a46c' : '#e5484d'}`,
        }}
      >
        <strong style={{ color: status.isReady ? '#30a46c' : '#e5484d' }}>
          {status.isReady
            ? 'Square is configured and ready to accept payments'
            : 'Square is not fully configured — payments will fail'}
        </strong>
      </div>
    </div>
  )
}
