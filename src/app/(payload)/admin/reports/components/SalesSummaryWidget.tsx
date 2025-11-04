'use client'

import React, { useEffect, useState } from 'react'

interface SalesSummary {
  totalRevenue: number
  transactionCount: number
  averageTransactionValue: number
}

export function SalesSummaryWidget() {
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        if (isMounted) setLoading(true)
        const today = new Date().toISOString().split('T')[0]
        const response = await fetch(`/api/reports/daily-sales?startDate=${today}&endDate=${today}`)

        if (!response.ok) {
          throw new Error('Failed to fetch sales data')
        }

        const data = await response.json()
        if (isMounted) {
          if (data.success) {
            setSummary(data.data.summary)
          } else {
            throw new Error(data.error || 'Unknown error')
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load sales data')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div style={styles.widget}>
        <h3 style={styles.title}>Today&apos;s Sales</h3>
        <div style={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div style={styles.widget}>
        <h3 style={styles.title}>Today&apos;s Sales</h3>
        <div style={styles.error}>{error || 'No data available'}</div>
      </div>
    )
  }

  return (
    <div style={styles.widget}>
      <h3 style={styles.title}>Today&apos;s Sales</h3>
      <div style={styles.stats}>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Revenue</div>
          <div style={styles.statValue}>${summary.totalRevenue.toFixed(2)}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Transactions</div>
          <div style={styles.statValue}>{summary.transactionCount}</div>
        </div>
        <div style={styles.stat}>
          <div style={styles.statLabel}>Avg. Transaction</div>
          <div style={styles.statValue}>${summary.averageTransactionValue.toFixed(2)}</div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  widget: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
  },
  title: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  stat: {
    textAlign: 'center' as const,
  },
  statLabel: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2d3748',
  },
  loading: {
    padding: '20px',
    textAlign: 'center' as const,
    color: '#718096',
  },
  error: {
    padding: '20px',
    textAlign: 'center' as const,
    color: '#e53e3e',
  },
}
