/**
 * Daily Sales Report API
 * Returns sales data aggregated by date
 *
 * TIMEZONE HANDLING:
 * All dates are parsed and stored in UTC. When providing startDate/endDate:
 * - Format: YYYY-MM-DD (e.g., "2024-11-04")
 * - Interpreted as: midnight UTC on that date
 * - Example: "2024-11-04" becomes "2024-11-04T00:00:00.000Z"
 * - End dates include the full day: "2024-11-04" becomes "2024-11-04T23:59:59.999Z"
 *
 * IMPORTANT: If you need results for a specific timezone, adjust your dates accordingly.
 * For example, to get sales for 2024-11-04 in EST (UTC-5), query:
 * - startDate: 2024-11-04 (covers 7pm EST on 11/03 to 7pm EST on 11/04)
 * OR adjust client-side to account for timezone offset.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { MAX_SALES_QUERY_LIMIT } from '@/lib/reports/constants'
import { formatCurrency, validateDateRange } from '@/lib/reports/validation'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    // Parse date range from query params (defaults to today)
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // Input validation
    const validation = validateDateRange(startDate, endDate)
    if (!validation.isValid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    }

    // Query sales within date range
    const { docs: sales, totalDocs } = await payload.find({
      collection: 'sales',
      where: {
        saleDate: {
          greater_than_equal: new Date(startDate).toISOString(),
          less_than_equal: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
        },
      },
      depth: 1, // Include customer relationship
      limit: MAX_SALES_QUERY_LIMIT,
    })

    // Check for data truncation
    const isDataTruncated = totalDocs > MAX_SALES_QUERY_LIMIT
    const truncationWarning = isDataTruncated
      ? `WARNING: Results limited to ${MAX_SALES_QUERY_LIMIT} of ${totalDocs} total sales. Revenue and statistics are INCOMPLETE. Please narrow your date range for accurate results.`
      : undefined

    // Aggregate data
    const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0)
    const transactionCount = sales.length
    const averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0

    // Sales by payment method
    const salesByPaymentMethod = sales.reduce(
      (acc, sale) => {
        const method = sale.paymentMethod || 'UNKNOWN'
        acc[method] = (acc[method] || 0) + (sale.totalAmount || 0)
        return acc
      },
      {} as Record<string, number>,
    )

    // Group sales by date (for multi-day ranges)
    const salesByDate = sales.reduce(
      (acc, sale) => {
        const date = new Date(sale.saleDate).toISOString().split('T')[0]
        if (!acc[date]) {
          acc[date] = {
            date,
            revenue: 0,
            transactions: 0,
          }
        }
        acc[date].revenue += sale.totalAmount || 0
        acc[date].transactions += 1
        return acc
      },
      {} as Record<string, { date: string; revenue: number; transactions: number }>,
    )

    return NextResponse.json({
      success: true,
      warning: truncationWarning,
      data: {
        period: {
          startDate,
          endDate,
        },
        metadata: {
          totalRecords: totalDocs,
          returnedRecords: sales.length,
          isDataTruncated,
        },
        summary: {
          totalRevenue: formatCurrency(totalRevenue),
          transactionCount,
          averageTransactionValue: formatCurrency(averageTransactionValue),
        },
        salesByPaymentMethod,
        salesByDate: Object.values(salesByDate).sort((a, b) => a.date.localeCompare(b.date)),
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate daily sales report',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 },
    )
  }
}
