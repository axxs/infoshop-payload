/**
 * Revenue Tracking API
 * Returns revenue data with various time groupings and comparisons
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
import { getISOWeek, getISOWeekYear } from 'date-fns'
import {
  DEFAULT_DATE_RANGE_DAYS,
  DEFAULT_MONTH_RANGE_MONTHS,
  DEFAULT_WEEK_RANGE_DAYS,
  MAX_SALES_QUERY_LIMIT,
} from '@/lib/reports/constants'
import {
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  validateDateRange,
} from '@/lib/reports/validation'

type GroupBy = 'day' | 'week' | 'month'

interface RevenueDataPoint {
  period: string
  revenueCents: number
  transactions: number
}

function getGroupKey(date: Date, groupBy: GroupBy): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  switch (groupBy) {
    case 'day':
      return `${year}-${month}-${day}`
    case 'week': {
      // ISO 8601 week date calculation using date-fns (production-ready)
      // Week 1 is the week with the first Thursday of the year
      const weekNum = getISOWeek(date)
      const weekYear = getISOWeekYear(date)
      return `${weekYear}-W${String(weekNum).padStart(2, '0')}`
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

    // Parse and validate query parameters
    const groupByParam = searchParams.get('groupBy') || 'day'
    const validGroupByOptions: GroupBy[] = ['day', 'week', 'month']

    if (!validGroupByOptions.includes(groupByParam as GroupBy)) {
      return NextResponse.json(
        { success: false, error: 'Invalid groupBy parameter. Use "day", "week", or "month"' },
        { status: 400 },
      )
    }

    const groupBy = groupByParam as GroupBy
    const endDate = new Date()
    const startDate = new Date(endDate)

    // Default date ranges based on groupBy
    switch (groupBy) {
      case 'day':
        startDate.setDate(startDate.getDate() - DEFAULT_DATE_RANGE_DAYS)
        break
      case 'week':
        startDate.setDate(startDate.getDate() - DEFAULT_WEEK_RANGE_DAYS)
        break
      case 'month':
        startDate.setMonth(startDate.getMonth() - DEFAULT_MONTH_RANGE_MONTHS)
        break
    }

    const startDateParam = searchParams.get('startDate') || startDate.toISOString().split('T')[0]
    const endDateParam = searchParams.get('endDate') || endDate.toISOString().split('T')[0]

    // Input validation
    const validation = validateDateRange(startDateParam, endDateParam)
    if (!validation.isValid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    }

    // Query sales within date range
    const { docs: sales, totalDocs } = await payload.find({
      collection: 'sales',
      where: {
        saleDate: {
          greater_than_equal: new Date(startDateParam).toISOString(),
          less_than_equal: new Date(`${endDateParam}T23:59:59.999Z`).toISOString(),
        },
      },
      limit: MAX_SALES_QUERY_LIMIT,
    })

    // Check for data truncation
    const isDataTruncated = totalDocs > MAX_SALES_QUERY_LIMIT
    const truncationWarning = isDataTruncated
      ? `WARNING: Results limited to ${MAX_SALES_QUERY_LIMIT} of ${totalDocs} total sales. Revenue statistics are INCOMPLETE. Please narrow your date range for accurate results.`
      : undefined

    // Group revenue by time period using integer cents for precision
    const revenueByPeriod = new Map<string, RevenueDataPoint>()

    for (const sale of sales) {
      const saleDate = new Date(sale.saleDate)
      const period = getGroupKey(saleDate, groupBy)
      const saleCents = dollarsToCents(sale.totalAmount || 0)

      const existing = revenueByPeriod.get(period)
      if (existing) {
        existing.revenueCents += saleCents
        existing.transactions += 1
      } else {
        revenueByPeriod.set(period, {
          period,
          revenueCents: saleCents,
          transactions: 1,
        })
      }
    }

    // Convert to sorted array with dollars
    const revenueData = Array.from(revenueByPeriod.values())
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((point) => ({
        period: point.period,
        revenue: centsToDollars(point.revenueCents),
        transactions: point.transactions,
        averageValue:
          point.transactions > 0
            ? centsToDollars(Math.round(point.revenueCents / point.transactions))
            : 0,
      }))

    // Calculate summary statistics
    const totalRevenue = revenueData.reduce((sum, point) => sum + point.revenue, 0)
    const totalTransactions = revenueData.reduce((sum, point) => sum + point.transactions, 0)
    const averageRevenuePerPeriod = revenueData.length > 0 ? totalRevenue / revenueData.length : 0

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
      warning: truncationWarning,
      data: {
        period: {
          startDate: startDateParam,
          endDate: endDateParam,
          groupBy,
        },
        metadata: {
          totalRecords: totalDocs,
          returnedRecords: sales.length,
          isDataTruncated,
        },
        summary: {
          totalRevenue: formatCurrency(totalRevenue),
          totalTransactions,
          averageRevenuePerPeriod: formatCurrency(averageRevenuePerPeriod),
          periodsWithData: revenueData.length,
          growthRate: growthRate !== null ? formatCurrency(growthRate) : null,
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
