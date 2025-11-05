'use client'

/**
 * Custom Stock Status Cell Component
 * Displays stock quantity with visual indicators (colors and icons) in the admin list view
 *
 * @remarks
 * This component provides at-a-glance visibility of inventory status with color-coded badges.
 * It helps admins quickly identify low stock and out-of-stock items.
 *
 * @example
 * ```typescript
 * // In collection config:
 * {
 *   name: 'stockQuantity',
 *   type: 'number',
 *   admin: {
 *     components: {
 *       Cell: '@/collections/Books/StockStatusCell#StockStatusCell',
 *     },
 *   },
 * }
 * ```
 */

import React from 'react'

/**
 * Book data structure passed to the cell component
 */
interface BookRowData {
  stockQuantity?: number
  stockStatus?: string
  reorderLevel?: number
}

/**
 * Props for StockStatusCell component
 */
interface StockStatusCellProps {
  /** The row data containing book information */
  rowData: BookRowData
}

/**
 * Status styling configuration
 */
interface StatusStyles {
  bgColor: string
  textColor: string
  icon: string
  label: string
}

/**
 * Custom cell component for displaying stock status with visual indicators
 *
 * @param props - Component props
 * @returns React component
 */
export const StockStatusCell: React.FC<StockStatusCellProps> = ({ rowData }) => {
  const { stockQuantity = 0, stockStatus = 'IN_STOCK', reorderLevel = 5 } = rowData

  /**
   * Determines styling based on stock status
   *
   * @param status - The current stock status
   * @returns Style configuration object
   */
  const getStatusStyles = (status: string): StatusStyles => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-700',
          icon: '❌',
          label: 'Out of Stock',
        }
      case 'LOW_STOCK':
        return {
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-700',
          icon: '⚠️',
          label: 'Low Stock',
        }
      case 'DISCONTINUED':
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-600',
          icon: '🚫',
          label: 'Discontinued',
        }
      case 'IN_STOCK':
      default:
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-700',
          icon: '✓',
          label: 'In Stock',
        }
    }
  }

  const styles = getStatusStyles(stockStatus)

  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded ${styles.bgColor} ${styles.textColor} font-medium text-xs`}
      >
        <span>{styles.icon}</span>
        <span>{stockQuantity}</span>
      </div>
      {stockStatus === 'LOW_STOCK' && (
        <span className="text-xs text-gray-500">(reorder at {reorderLevel})</span>
      )}
    </div>
  )
}
