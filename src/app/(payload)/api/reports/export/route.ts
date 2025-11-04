/**
 * Sales Data Export API
 * Exports sales data in CSV format
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { DEFAULT_DATE_RANGE_DAYS, MAX_SALES_QUERY_LIMIT } from '@/lib/reports/constants'

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  let str = String(value)

  // Prevent CSV injection by prefixing formulas with a single quote
  // This prevents Excel/Google Sheets from interpreting them as formulas
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r']
  if (dangerousChars.some((char) => str.startsWith(char))) {
    str = `'${str}`
  }

  // Escape double quotes and wrap in quotes if contains comma, newline, or quote
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function generateCSV(data: unknown[], headers: string[]): string {
  const csvRows: string[] = []

  // Add header row
  csvRows.push(headers.map(escapeCSV).join(','))

  // Add data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const value = (row as Record<string, unknown>)[header]
      return escapeCSV(value)
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
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
    const exportType = searchParams.get('type') || 'sales' // 'sales' or 'products'

    // Input validation
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

    if (exportType === 'sales') {
      // Export individual sales transactions
      const { docs: sales } = await payload.find({
        collection: 'sales',
        where: {
          saleDate: {
            greater_than_equal: startDateObj.toISOString(),
            less_than_equal: new Date(`${endDateParam}T23:59:59.999Z`).toISOString(),
          },
        },
        depth: 2, // Include customer and items
        limit: MAX_SALES_QUERY_LIMIT,
      })

      // Flatten sales data for CSV
      const flatData = sales.map((sale) => ({
        receiptNumber: sale.receiptNumber || '',
        saleDate: new Date(sale.saleDate).toISOString().split('T')[0],
        saleTime: new Date(sale.saleDate).toISOString().split('T')[1].split('.')[0],
        totalAmount: sale.totalAmount || 0,
        paymentMethod: sale.paymentMethod || '',
        customerEmail:
          typeof sale.customer === 'object' && sale.customer ? sale.customer.email : '',
        squareTransactionId: sale.squareTransactionId || '',
        itemCount: Array.isArray(sale.items) ? sale.items.length : 0,
        notes: sale.notes || '',
      }))

      const headers = [
        'receiptNumber',
        'saleDate',
        'saleTime',
        'totalAmount',
        'paymentMethod',
        'customerEmail',
        'squareTransactionId',
        'itemCount',
        'notes',
      ]

      const csv = generateCSV(flatData, headers)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="sales-export-${startDateParam}-to-${endDateParam}.csv"`,
        },
      })
    } else if (exportType === 'products') {
      // Export product sales summary
      // Fetch sales with items included (avoids N+1 query)
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

      // Aggregate by book
      const bookSales = new Map<
        string,
        {
          title: string
          author: string
          isbn: string
          quantitySold: number
          totalRevenue: number
          averagePrice: number
        }
      >()

      for (const item of filteredSaleItems) {
        const book = typeof item.book === 'object' ? item.book : null
        if (!book) continue

        const bookId = String(book.id)
        const existing = bookSales.get(bookId)

        if (existing) {
          existing.quantitySold += item.quantity || 0
          existing.totalRevenue += item.lineTotal || 0
          existing.averagePrice = existing.totalRevenue / existing.quantitySold
        } else {
          bookSales.set(bookId, {
            title: book.title || 'Unknown',
            author: book.author || '',
            isbn: book.isbn || '',
            quantitySold: item.quantity || 0,
            totalRevenue: item.lineTotal || 0,
            averagePrice: item.unitPrice || 0,
          })
        }
      }

      const flatData = Array.from(bookSales.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .map((book) => ({
          ...book,
          totalRevenue: Number(book.totalRevenue.toFixed(2)),
          averagePrice: Number(book.averagePrice.toFixed(2)),
        }))

      const headers = ['title', 'author', 'isbn', 'quantitySold', 'totalRevenue', 'averagePrice']

      const csv = generateCSV(flatData, headers)

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="product-sales-export-${startDateParam}-to-${endDateParam}.csv"`,
        },
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid export type. Use "sales" or "products"',
        },
        { status: 400 },
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export data',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 },
    )
  }
}
