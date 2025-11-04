/**
 * Product Sales Analysis API
 * Returns sales data aggregated by product/book
 *
 * TIMEZONE HANDLING:
 * All dates are parsed and stored in UTC. When providing startDate/endDate:
 * - Format: YYYY-MM-DD (e.g., "2024-11-04")
 * - Interpreted as: midnight UTC on that date
 * - Example: "2024-11-04" becomes "2024-11-04T00:00:00.000Z"
 * - End dates include the full day: "2024-11-04" becomes "2024-11-04T23:59:59.999Z"
 *
 * IMPORTANT: If you need results for a specific timezone, adjust your dates accordingly.
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
import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  validateDateRange,
} from '@/lib/reports/validation'

interface BookSalesData {
  bookId: string
  title: string
  author?: string
  quantitySold: number
  totalRevenueCents: number
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
    const validation = validateDateRange(startDateParam, endDateParam)
    if (!validation.isValid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    }

    // After validation, dates are guaranteed to be defined
    const startDateObj = validation.startDate!
    const endDateObj = validation.endDate!

    // Fetch sales with items included (depth: 2 gets items -> books)
    // This avoids N+1 query by fetching everything in one go
    const { docs: sales, totalDocs } = await payload.find({
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

    // Check for data truncation
    const isDataTruncated = totalDocs > MAX_SALES_QUERY_LIMIT
    const truncationWarning = isDataTruncated
      ? `WARNING: Results limited to ${MAX_SALES_QUERY_LIMIT} of ${totalDocs} total sales. Product sales statistics are INCOMPLETE. Please narrow your date range for accurate results.`
      : undefined

    // Extract sale items from sales (avoiding separate query)
    const filteredSaleItems = sales.flatMap((sale) => {
      if (!Array.isArray(sale.items)) return []
      return sale.items.filter((item) => typeof item === 'object' && item !== null)
    })

    // Aggregate sales by book using integer cents for precision
    const bookSalesMap = new Map<string, BookSalesData>()

    for (const item of filteredSaleItems) {
      const book = typeof item.book === 'object' ? item.book : null
      if (!book) continue

      const bookId = String(book.id)
      const existing = bookSalesMap.get(bookId)
      const lineTotalCents = dollarsToCents(item.lineTotal || 0)

      if (existing) {
        existing.quantitySold += item.quantity || 0
        existing.totalRevenueCents += lineTotalCents
        existing.transactionCount += 1
      } else {
        bookSalesMap.set(bookId, {
          bookId,
          title: book.title || 'Unknown',
          author: book.author || undefined,
          quantitySold: item.quantity || 0,
          totalRevenueCents: lineTotalCents,
          transactionCount: 1,
        })
      }
    }

    // Convert to array and sort by revenue (descending)
    const topProducts = Array.from(bookSalesMap.values())
      .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)
      .slice(0, limit)
      .map((product) => ({
        bookId: product.bookId,
        title: product.title,
        author: product.author,
        quantitySold: product.quantitySold,
        totalRevenue: centsToDollars(product.totalRevenueCents),
        averagePrice:
          product.quantitySold > 0
            ? centsToDollars(Math.round(product.totalRevenueCents / product.quantitySold))
            : 0,
        transactionCount: product.transactionCount,
      }))

    // Calculate summary statistics
    const totalQuantitySold = topProducts.reduce((sum, p) => sum + p.quantitySold, 0)
    const totalRevenue = topProducts.reduce((sum, p) => sum + p.totalRevenue, 0)
    const uniqueProducts = bookSalesMap.size

    return NextResponse.json({
      success: true,
      warning: truncationWarning,
      data: {
        period: {
          startDate: startDateParam,
          endDate: endDateParam,
        },
        metadata: {
          totalRecords: totalDocs,
          returnedRecords: sales.length,
          isDataTruncated,
        },
        summary: {
          uniqueProducts,
          totalQuantitySold,
          totalRevenue: formatCurrency(totalRevenue),
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
