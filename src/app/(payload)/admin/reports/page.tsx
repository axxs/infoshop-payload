'use client'

import React from 'react'
import { SalesSummaryWidget } from './components/SalesSummaryWidget'
import { TopProductsWidget } from './components/TopProductsWidget'
import { RevenueChartWidget } from './components/RevenueChartWidget'
import { DEFAULT_DATE_RANGE_DAYS, TOP_PRODUCTS_DAYS } from '@/lib/reports/constants'

export default function ReportsPage() {
  const [exporting, setExporting] = React.useState<'sales' | 'products' | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handleExport = async (type: 'sales' | 'products') => {
    try {
      setExporting(type)
      setError(null)

      const endDate = new Date()
      const startDate = new Date(endDate)
      startDate.setDate(startDate.getDate() - DEFAULT_DATE_RANGE_DAYS)

      const response = await fetch(
        `/api/reports/export?type=${type}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      // Download the CSV
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-export-${startDate.toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data'
      setError(errorMessage)
    } finally {
      setExporting(null)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>Sales Reports</h1>
        <div style={styles.actions}>
          <button
            onClick={() => handleExport('sales')}
            disabled={exporting !== null}
            style={{
              ...styles.exportButton,
              ...(exporting === 'sales' ? styles.exportButtonLoading : {}),
              ...(exporting !== null ? styles.exportButtonDisabled : {}),
            }}
          >
            {exporting === 'sales' ? 'Exporting...' : 'Export Sales (CSV)'}
          </button>
          <button
            onClick={() => handleExport('products')}
            disabled={exporting !== null}
            style={{
              ...styles.exportButton,
              ...(exporting === 'products' ? styles.exportButtonLoading : {}),
              ...(exporting !== null ? styles.exportButtonDisabled : {}),
            }}
          >
            {exporting === 'products' ? 'Exporting...' : 'Export Products (CSV)'}
          </button>
        </div>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          <span style={styles.errorIcon}>⚠️</span>
          <span style={styles.errorText}>{error}</span>
          <button onClick={() => setError(null)} style={styles.errorClose}>
            ×
          </button>
        </div>
      )}

      <div style={styles.content}>
        <SalesSummaryWidget />
        <RevenueChartWidget />
        <TopProductsWidget />

        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>About Reports</h3>
          <ul style={styles.infoList}>
            <li>Sales Summary shows today&apos;s sales data</li>
            <li>
              Revenue Trend displays historical revenue patterns (last {DEFAULT_DATE_RANGE_DAYS}{' '}
              days by default)
            </li>
            <li>
              Top Selling Books shows the best performers from the last {TOP_PRODUCTS_DAYS} days
            </li>
            <li>
              Export functionality provides last {DEFAULT_DATE_RANGE_DAYS} days of data in CSV
              format
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e2e8f0',
  },
  pageTitle: {
    margin: '0',
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  exportButton: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid #3182ce',
    borderRadius: '6px',
    backgroundColor: '#3182ce',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  exportButtonLoading: {
    backgroundColor: '#2c5282',
    cursor: 'wait',
  },
  exportButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    marginBottom: '24px',
    backgroundColor: '#fed7d7',
    border: '1px solid #fc8181',
    borderRadius: '6px',
    color: '#742a2a',
  },
  errorIcon: {
    fontSize: '20px',
  },
  errorText: {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
  },
  errorClose: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    fontWeight: '700',
    color: '#742a2a',
    cursor: 'pointer',
    padding: '0',
    lineHeight: '1',
  },
  content: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
  },
  infoBox: {
    backgroundColor: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '24px',
    marginTop: '24px',
  },
  infoTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  infoList: {
    margin: '0',
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.8',
  },
}
