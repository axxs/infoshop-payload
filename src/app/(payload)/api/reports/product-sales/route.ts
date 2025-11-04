/**
 * Product Sales Analysis API
 * Returns sales data aggregated by product/book
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  DEFAULT_DATE_RANGE_DAYS,
  DEFAULT_TOP_PRODUCTS_LIMIT,
  MAX_SALES_QUERY_LIMIT,
  MAX_TOP_PRODUCTS_LIMIT,
} from '@/lib/reports/constants'

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
    startDate.setDate(startDate.getDate() - DEFAULT_DATE_RANGE_DAYS)

    const startDateParam = searchParams.get('startDate') || startDate.toISOString().split('T')[0]
    const endDateParam = searchParams.get('endDate') || endDate.toISOString().split('T')[0]
    const limitParam = searchParams.get('limit') || String(DEFAULT_TOP_PRODUCTS_LIMIT)

    // Input validation
    const limit = Math.min(Math.max(parseInt(limitParam, 10), 1), MAX_TOP_PRODUCTS_LIMIT)

    // Validate dates
    const startDateObj = new Date(startDateParam)
    const endDateObj = new Date(endDateParam)

    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 },
      )
    }

    if (startDateObj > endDateObj) {
      return NextResponse.json(
        { success: false, error: 'startDate cannot be after endDate' },
        { status: 400 },
      )
    }

    // Fetch sales with items included (depth: 2 gets items -> books)
    // This avoids N+1 query by fetching everything in one go
    const { docs: sales } = await payload.find({
      collection: 'sales',
      where: {
        saleDate: {
          greater_than_equal: startDateObj.toISOString(),
          less_than_equal: new Date(`${endDateParam}T23:59:59.999Z`).toISOString(),
        },
      },
      depth: 2, // Include items with book details
      limit: MAX_SALES_QUERY_LIMIT,
    })

    // Extract sale items from sales (avoiding separate query)
    const filteredSaleItems = sales.flatMap((sale) => {
      if (!Array.isArray(sale.items)) return []
      return sale.items.filter((item) => typeof item === 'object' && item !== null)
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
