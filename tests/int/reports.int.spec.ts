/// <reference types="vitest" />
/**
 * Integration tests for Reports APIs
 */

import { NextRequest } from 'next/server'
import { GET as dailySalesGET } from '../../src/app/(payload)/api/reports/daily-sales/route'
import { GET as productSalesGET } from '../../src/app/(payload)/api/reports/product-sales/route'
import { GET as revenueGET } from '../../src/app/(payload)/api/reports/revenue/route'
import { GET as exportGET } from '../../src/app/(payload)/api/reports/export/route'

describe('Reports API Integration Tests', () => {
  describe('Daily Sales API', () => {
    it('should return 400 for invalid date format', async () => {
      const request = new NextRequest('http://localhost/api/reports/daily-sales?startDate=invalid')
      const response = await dailySalesGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid date format')
    })

    it('should return 400 when startDate is after endDate', async () => {
      const request = new NextRequest(
        'http://localhost/api/reports/daily-sales?startDate=2024-12-31&endDate=2024-01-01',
      )
      const response = await dailySalesGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('startDate cannot be after endDate')
    })

    it('should return valid structure with date range', async () => {
      const request = new NextRequest(
        'http://localhost/api/reports/daily-sales?startDate=2024-01-01&endDate=2024-01-31',
      )
      const response = await dailySalesGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('period')
      expect(data.data).toHaveProperty('summary')
      expect(data.data).toHaveProperty('salesByPaymentMethod')
      expect(data.data).toHaveProperty('salesByDate')
      expect(data.data.summary).toHaveProperty('totalRevenue')
      expect(data.data.summary).toHaveProperty('transactionCount')
      expect(data.data.summary).toHaveProperty('averageTransactionValue')
    })
  })

  describe('Product Sales API', () => {
    it('should return 400 for invalid date format', async () => {
      const request = new NextRequest(
        'http://localhost/api/reports/product-sales?startDate=invalid',
      )
      const response = await productSalesGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid date format')
    })

    it('should return 400 when startDate is after endDate', async () => {
      const request = new NextRequest(
        'http://localhost/api/reports/product-sales?startDate=2024-12-31&endDate=2024-01-01',
      )
      const response = await productSalesGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('startDate cannot be after endDate')
    })

    it('should respect limit parameter (clamping to max)', async () => {
      const request = new NextRequest(
        'http://localhost/api/reports/product-sales?limit=200', // Above max of 100
      )
      const response = await productSalesGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.topProducts.length).toBeLessThanOrEqual(100)
    })

    it('should return valid structure', async () => {
      const request = new NextRequest('http://localhost/api/reports/product-sales')
      const response = await productSalesGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('period')
      expect(data.data).toHaveProperty('summary')
      expect(data.data).toHaveProperty('topProducts')
      expect(data.data.summary).toHaveProperty('uniqueProducts')
      expect(data.data.summary).toHaveProperty('totalQuantitySold')
      expect(data.data.summary).toHaveProperty('totalRevenue')
    })
  })

  describe('Revenue API', () => {
    it('should return 400 for invalid groupBy parameter', async () => {
      const request = new NextRequest('http://localhost/api/reports/revenue?groupBy=invalid')
      const response = await revenueGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid groupBy parameter')
    })

    it('should return 400 for invalid date format', async () => {
      const request = new NextRequest('http://localhost/api/reports/revenue?startDate=invalid')
      const response = await revenueGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid date format')
    })

    it('should return 400 when startDate is after endDate', async () => {
      const request = new NextRequest(
        'http://localhost/api/reports/revenue?startDate=2024-12-31&endDate=2024-01-01',
      )
      const response = await revenueGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('startDate cannot be after endDate')
    })

    it('should accept valid groupBy values (day, week, month)', async () => {
      const groupByValues = ['day', 'week', 'month']

      for (const groupBy of groupByValues) {
        const request = new NextRequest(`http://localhost/api/reports/revenue?groupBy=${groupBy}`)
        const response = await revenueGET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.period.groupBy).toBe(groupBy)
      }
    })

    it('should return valid structure', async () => {
      const request = new NextRequest('http://localhost/api/reports/revenue?groupBy=day')
      const response = await revenueGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('period')
      expect(data.data).toHaveProperty('summary')
      expect(data.data).toHaveProperty('revenueData')
      expect(data.data.period).toHaveProperty('groupBy')
      expect(data.data.summary).toHaveProperty('totalRevenue')
      expect(data.data.summary).toHaveProperty('totalTransactions')
      expect(data.data.summary).toHaveProperty('averageRevenuePerPeriod')
      expect(Array.isArray(data.data.revenueData)).toBe(true)
    })
  })

  describe('Export API', () => {
    it('should return 400 for invalid export type', async () => {
      const request = new NextRequest('http://localhost/api/reports/export?type=invalid')
      const response = await exportGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid export type')
    })

    it('should return 400 for invalid date format', async () => {
      const request = new NextRequest(
        'http://localhost/api/reports/export?type=sales&startDate=invalid',
      )
      const response = await exportGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid date format')
    })

    it('should return 400 when startDate is after endDate', async () => {
      const request = new NextRequest(
        'http://localhost/api/reports/export?type=sales&startDate=2024-12-31&endDate=2024-01-01',
      )
      const response = await exportGET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('startDate cannot be after endDate')
    })

    it('should return CSV with correct content-type for sales export', async () => {
      const request = new NextRequest(
        'http://localhost/api/reports/export?type=sales&startDate=2024-01-01&endDate=2024-01-31',
      )
      const response = await exportGET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain('sales-export')
    })

    it('should return CSV with correct content-type for products export', async () => {
      const request = new NextRequest(
        'http://localhost/api/reports/export?type=products&startDate=2024-01-01&endDate=2024-01-31',
      )
      const response = await exportGET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/csv')
      expect(response.headers.get('Content-Disposition')).toContain('product-sales-export')
    })
  })
})
