/**
 * Product Sales Analysis API
 * Returns sales data aggregated by product/book
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

interface BookSalesData {
  bookId: string
  title: string
  author?: string
  quantitySold: number
  totalRevenue: number
  averagePrice: number
  transactionCount: number
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    // Parse date range from query params (defaults to last 30 days)
    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 30)

    const startDateParam = searchParams.get('startDate') || startDate.toISOString().split('T')[0]
    const endDateParam = searchParams.get('endDate') || endDate.toISOString().split('T')[0]
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Query all sale items within date range
    const { docs: saleItems } = await payload.find({
      collection: 'sale-items',
      depth: 2, // Include book details
      limit: 10000, // High limit for aggregation
    })

    // Get sales to filter by date
    const { docs: sales } = await payload.find({
      collection: 'sales',
      where: {
        saleDate: {
          greater_than_equal: new Date(startDateParam).toISOString(),
          less_than_equal: new Date(`${endDateParam}T23:59:59.999Z`).toISOString(),
        },
      },
      limit: 10000,
    })

    // Filter sale items to only those within our date range
    // Note: This is a workaround since sale-items doesn't have direct date field
    const filteredSaleItems = saleItems.filter((item) => {
      // Check if this item belongs to a sale in our date range
      // This requires checking all sales to find which one contains this item
      return sales.some((sale) => {
        const saleItemIds = Array.isArray(sale.items)
          ? sale.items.map((i) => {
              if (typeof i === 'string' || typeof i === 'number') return String(i)
              return i.id
            })
          : []
        return saleItemIds.includes(item.id)
      })
    })

    // Aggregate sales by book
    const bookSalesMap = new Map<string, BookSalesData>()

    for (const item of filteredSaleItems) {
      const book = typeof item.book === 'object' ? item.book : null
      if (!book) continue

      const bookId = String(book.id)
      const existing = bookSalesMap.get(bookId)

      if (existing) {
        existing.quantitySold += item.quantity || 0
        existing.totalRevenue += item.lineTotal || 0
        existing.transactionCount += 1
        existing.averagePrice = existing.totalRevenue / existing.quantitySold
      } else {
        bookSalesMap.set(bookId, {
          bookId,
          title: book.title || 'Unknown',
          author: book.author || undefined,
          quantitySold: item.quantity || 0,
          totalRevenue: item.lineTotal || 0,
          averagePrice: item.unitPrice || 0,
          transactionCount: 1,
        })
      }
    }

    // Convert to array and sort by revenue (descending)
    const topProducts = Array.from(bookSalesMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)
      .map((product) => ({
        ...product,
        totalRevenue: Number(product.totalRevenue.toFixed(2)),
        averagePrice: Number(product.averagePrice.toFixed(2)),
      }))

    // Calculate summary statistics
    const totalQuantitySold = topProducts.reduce((sum, p) => sum + p.quantitySold, 0)
    const totalRevenue = topProducts.reduce((sum, p) => sum + p.totalRevenue, 0)
    const uniqueProducts = bookSalesMap.size

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate: startDateParam,
          endDate: endDateParam,
        },
        summary: {
          uniqueProducts,
          totalQuantitySold,
          totalRevenue: Number(totalRevenue.toFixed(2)),
        },
        topProducts,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate product sales report',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 },
    )
  }
}
