/**
 * Revenue Tracking API
 * Returns revenue data with various time groupings and comparisons
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'

type GroupBy = 'day' | 'week' | 'month'

interface RevenueDataPoint {
  period: string
  revenue: number
  transactions: number
  averageValue: number
}

function getGroupKey(date: Date, groupBy: GroupBy): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  switch (groupBy) {
    case 'day':
      return `${year}-${month}-${day}`
    case 'week': {
      // Get ISO week number
      const firstDayOfYear = new Date(year, 0, 1)
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
      const weekNumber = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
      return `${year}-W${String(weekNumber).padStart(2, '0')}`
    }
    case 'month':
      return `${year}-${month}`
    default:
      return `${year}-${month}-${day}`
  }
}

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const groupBy = (searchParams.get('groupBy') || 'day') as GroupBy
    const endDate = new Date()
    const startDate = new Date(endDate)

    // Default date ranges based on groupBy
    switch (groupBy) {
      case 'day':
        startDate.setDate(startDate.getDate() - 30) // Last 30 days
        break
      case 'week':
        startDate.setDate(startDate.getDate() - 84) // Last 12 weeks
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - 12) // Last 12 months
        break
    }

    const startDateParam = searchParams.get('startDate') || startDate.toISOString().split('T')[0]
    const endDateParam = searchParams.get('endDate') || endDate.toISOString().split('T')[0]

    // Query sales within date range
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

    // Group revenue by time period
    const revenueByPeriod = new Map<string, RevenueDataPoint>()

    for (const sale of sales) {
      const saleDate = new Date(sale.saleDate)
      const period = getGroupKey(saleDate, groupBy)

      const existing = revenueByPeriod.get(period)
      if (existing) {
        existing.revenue += sale.totalAmount || 0
        existing.transactions += 1
        existing.averageValue = existing.revenue / existing.transactions
      } else {
        revenueByPeriod.set(period, {
          period,
          revenue: sale.totalAmount || 0,
          transactions: 1,
          averageValue: sale.totalAmount || 0,
        })
      }
    }

    // Convert to sorted array
    const revenueData = Array.from(revenueByPeriod.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((point) => ({
        ...point,
        revenue: Number(point.revenue.toFixed(2)),
        averageValue: Number(point.averageValue.toFixed(2)),
      }))

    // Calculate summary statistics
    const totalRevenue = revenueData.reduce((sum, point) => sum + point.revenue, 0)
    const totalTransactions = revenueData.reduce((sum, point) => sum + point.transactions, 0)
    const averageRevenuePerPeriod =
      revenueData.length > 0 ? totalRevenue / revenueData.length : 0

    // Calculate growth (compare last period to previous)
    let growthRate: number | null = null
    if (revenueData.length >= 2) {
      const current = revenueData[revenueData.length - 1].revenue
      const previous = revenueData[revenueData.length - 2].revenue
      if (previous > 0) {
        growthRate = Number((((current - previous) / previous) * 100).toFixed(2))
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        period: {
          startDate: startDateParam,
          endDate: endDateParam,
          groupBy,
        },
        summary: {
          totalRevenue: Number(totalRevenue.toFixed(2)),
          totalTransactions,
          averageRevenuePerPeriod: Number(averageRevenuePerPeriod.toFixed(2)),
          periodsWithData: revenueData.length,
          growthRate,
        },
        revenueData,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate revenue report',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 },
    )
  }
}
