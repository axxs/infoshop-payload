/**
 * Daily Sales Report API
 * Returns sales data aggregated by date
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    // Parse date range from query params (defaults to today)
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

    // Query sales within date range
    const { docs: sales } = await payload.find({
      collection: 'sales',
      where: {
        saleDate: {
          greater_than_equal: new Date(startDate).toISOString(),
          less_than_equal: new Date(`${endDate}T23:59:59.999Z`).toISOString(),
        },
      },
      depth: 1, // Include customer relationship
      limit: 1000, // Reasonable limit for daily reports
    })

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
      data: {
        period: {
          startDate,
          endDate,
        },
        summary: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          transactionCount,
          averageTransactionValue: Number(averageTransactionValue.toFixed(2)),
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
