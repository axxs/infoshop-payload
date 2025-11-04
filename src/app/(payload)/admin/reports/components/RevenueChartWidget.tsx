'use client'

import React, { useEffect, useState } from 'react'

interface RevenueDataPoint {
  period: string
  revenue: number
  transactions: number
}

export function RevenueChartWidget() {
  const [data, setData] = useState<RevenueDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day')

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const response = await fetch(`/api/reports/revenue?groupBy=${groupBy}`)

        if (!response.ok) {
          throw new Error('Failed to fetch revenue data')
        }

        const result = await response.json()
        if (result.success) {
          setData(result.data.revenueData)
        } else {
          throw new Error(result.error || 'Unknown error')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load revenue data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [groupBy])

  if (loading) {
    return (
      <div style={styles.widget}>
        <div style={styles.header}>
          <h3 style={styles.title}>Revenue Trend</h3>
        </div>
        <div style={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (error || !data.length) {
    return (
      <div style={styles.widget}>
        <div style={styles.header}>
          <h3 style={styles.title}>Revenue Trend</h3>
        </div>
        <div style={styles.error}>{error || 'No revenue data available'}</div>
      </div>
    )
  }

  // Calculate max revenue for scaling
  const maxRevenue = Math.max(...data.map((d) => d.revenue))
  const scale = maxRevenue > 0 ? 150 / maxRevenue : 1

  return (
    <div style={styles.widget}>
      <div style={styles.header}>
        <h3 style={styles.title}>Revenue Trend</h3>
        <div style={styles.controls}>
          <button
            onClick={() => setGroupBy('day')}
            style={groupBy === 'day' ? styles.buttonActive : styles.button}
          >
            Daily
          </button>
          <button
            onClick={() => setGroupBy('week')}
            style={groupBy === 'week' ? styles.buttonActive : styles.button}
          >
            Weekly
          </button>
          <button
            onClick={() => setGroupBy('month')}
            style={groupBy === 'month' ? styles.buttonActive : styles.button}
          >
            Monthly
          </button>
        </div>
      </div>

      <div style={styles.chart}>
        <div style={styles.bars}>
          {data.slice(-20).map((point, index) => (
            <div key={point.period} style={styles.barContainer}>
              <div
                style={{
                  ...styles.bar,
                  height: `${point.revenue * scale}px`,
                }}
                title={`${point.period}: $${point.revenue.toFixed(2)} (${point.transactions} transactions)`}
              />
              {index % Math.ceil(data.length / 10) === 0 && (
                <div style={styles.barLabel}>{point.period.split('-').slice(-1)[0]}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={styles.legendColor} />
          <span>Revenue</span>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    margin: '0',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a202c',
  },
  controls: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    padding: '6px 12px',
    fontSize: '14px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    backgroundColor: '#fff',
    color: '#4a5568',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonActive: {
    padding: '6px 12px',
    fontSize: '14px',
    border: '1px solid #3182ce',
    borderRadius: '4px',
    backgroundColor: '#3182ce',
    color: '#fff',
    cursor: 'pointer',
  },
  chart: {
    position: 'relative' as const,
    height: '200px',
    marginBottom: '16px',
  },
  bars: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
    gap: '4px',
  },
  barContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    flex: 1,
    minWidth: '20px',
  },
  bar: {
    width: '100%',
    backgroundColor: '#3182ce',
    borderRadius: '4px 4px 0 0',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    minHeight: '2px',
  },
  barLabel: {
    fontSize: '10px',
    color: '#718096',
    marginTop: '4px',
    whiteSpace: 'nowrap' as const,
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e2e8f0',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#4a5568',
  },
  legendColor: {
    width: '16px',
    height: '16px',
    backgroundColor: '#3182ce',
    borderRadius: '2px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#718096',
  },
  error: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#e53e3e',
  },
}
