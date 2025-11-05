'use client'

/**
 * Custom Stock Status Cell Component
 * Displays stock quantity with visual indicators (colors and icons)
 */

import React from 'react'

interface StockStatusCellProps {
  rowData: {
    stockQuantity?: number
    stockStatus?: string
    reorderLevel?: number
  }
}

export const StockStatusCell: React.FC<StockStatusCellProps> = ({ rowData }) => {
  const { stockQuantity = 0, stockStatus = 'IN_STOCK', reorderLevel = 5 } = rowData

  // Determine color and icon based on stock status
  const getStatusStyles = () => {
    switch (stockStatus) {
      case 'OUT_OF_STOCK':
        return {
          color: '#dc2626',
          backgroundColor: '#fee2e2',
          icon: '❌',
          label: 'Out of Stock',
        }
      case 'LOW_STOCK':
        return {
          color: '#d97706',
          backgroundColor: '#fef3c7',
          icon: '⚠️',
          label: 'Low Stock',
        }
      case 'DISCONTINUED':
        return {
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
          icon: '🚫',
          label: 'Discontinued',
        }
      case 'IN_STOCK':
      default:
        return {
          color: '#059669',
          backgroundColor: '#d1fae5',
          icon: '✓',
          label: 'In Stock',
        }
    }
  }

  const styles = getStatusStyles()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontWeight: '500',
          fontSize: '12px',
        }}
      >
        <span>{styles.icon}</span>
        <span>{stockQuantity}</span>
      </div>
      {stockStatus === 'LOW_STOCK' && (
        <span
          style={{
            fontSize: '11px',
            color: '#6b7280',
          }}
        >
          (reorder at {reorderLevel})
        </span>
      )}
    </div>
  )
}
