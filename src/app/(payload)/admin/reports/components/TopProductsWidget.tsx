'use client'

import React, { useEffect, useState } from 'react'
import { TOP_PRODUCTS_DAYS, TOP_PRODUCTS_WIDGET_LIMIT } from '@/lib/reports/constants'

interface ProductSales {
  bookId: string
  title: string
  author?: string
  quantitySold: number
  totalRevenue: number
}

export function TopProductsWidget() {
  const [products, setProducts] = useState<ProductSales[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        if (isMounted) setLoading(true)
        // Get last 7 days of data
        const endDate = new Date()
        const startDate = new Date(endDate)
        startDate.setDate(startDate.getDate() - TOP_PRODUCTS_DAYS)

        const response = await fetch(
          `/api/reports/product-sales?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&limit=${TOP_PRODUCTS_WIDGET_LIMIT}`,
        )

        if (!response.ok) {
          throw new Error('Failed to fetch product sales data')
        }

        const data = await response.json()
        if (isMounted) {
          if (data.success) {
            setProducts(data.data.topProducts)
          } else {
            throw new Error(data.error || 'Unknown error')
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load product data')
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
        <h3 style={styles.title}>Top Selling Books (Last 7 Days)</h3>
        <div style={styles.loading}>Loading...</div>
      </div>
    )
  }

  if (error || !products.length) {
    return (
      <div style={styles.widget}>
        <h3 style={styles.title}>Top Selling Books (Last 7 Days)</h3>
        <div style={styles.error}>{error || 'No sales data available'}</div>
      </div>
    )
  }

  return (
    <div style={styles.widget}>
      <h3 style={styles.title}>Top Selling Books (Last 7 Days)</h3>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Title</th>
            <th style={{ ...styles.th, textAlign: 'center' }}>Qty Sold</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.bookId} style={styles.tr}>
              <td style={styles.td}>
                <div style={styles.productTitle}>{product.title}</div>
                {product.author && <div style={styles.productAuthor}>{product.author}</div>}
              </td>
              <td style={{ ...styles.td, textAlign: 'center' }}>{product.quantitySold}</td>
              <td style={{ ...styles.td, textAlign: 'right' }}>
                ${product.totalRevenue.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '12px 8px',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '14px',
    fontWeight: '600',
    color: '#4a5568',
    textAlign: 'left' as const,
  },
  tr: {
    borderBottom: '1px solid #f7fafc',
  },
  td: {
    padding: '12px 8px',
    fontSize: '14px',
    color: '#2d3748',
  },
  productTitle: {
    fontWeight: '500',
    marginBottom: '4px',
  },
  productAuthor: {
    fontSize: '12px',
    color: '#718096',
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
