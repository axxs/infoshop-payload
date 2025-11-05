/**
 * Order Management Server Actions
 * Handles order status updates, cancellations, and customer queries
 */

'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import type { Sale } from '@/payload-types'
import { revalidatePath } from 'next/cache'

export type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED'

export interface UpdateOrderStatusParams {
  saleId: number
  newStatus: OrderStatus
  note?: string
  userId?: number // User making the change
}

export interface UpdateOrderStatusResult {
  success: boolean
  error?: string
  sale?: Sale
}

export interface CancelOrderParams {
  saleId: number
  reason: string
  userId?: number
  restoreStock?: boolean
}

export interface CancelOrderResult {
  success: boolean
  error?: string
  sale?: Sale
}

export interface GetCustomerOrdersParams {
  customerId?: number
  customerEmail?: string
  limit?: number
  page?: number
  status?: OrderStatus
}

export interface GetCustomerOrdersResult {
  success: boolean
  orders: Sale[]
  totalDocs: number
  totalPages: number
  error?: string
}

/**
 * Update order status with history tracking
 */
export async function updateOrderStatus(
  params: UpdateOrderStatusParams,
): Promise<UpdateOrderStatusResult> {
  const { saleId, newStatus, note, userId } = params

  try {
    const payload = await getPayload({ config })

    // Fetch current sale
    const sale = await payload.findByID({
      collection: 'sales',
      id: saleId,
    })

    if (!sale) {
      return {
        success: false,
        error: 'Order not found',
      }
    }

    // Prevent invalid status transitions
    if (sale.status === 'CANCELLED' && newStatus !== 'CANCELLED') {
      return {
        success: false,
        error: 'Cannot change status of cancelled order',
      }
    }

    if (sale.status === 'REFUNDED' && newStatus !== 'REFUNDED') {
      return {
        success: false,
        error: 'Cannot change status of refunded order',
      }
    }

    // Build status history entry
    const statusHistoryEntry = {
      status: newStatus,
      timestamp: new Date().toISOString(),
      note: note || `Status changed from ${sale.status} to ${newStatus}`,
      changedBy: userId,
    }

    // Update sale with new status and history
    const updatedSale = await payload.update({
      collection: 'sales',
      id: saleId,
      data: {
        status: newStatus,
        statusHistory: [...(sale.statusHistory || []), statusHistoryEntry],
      },
    })

    // Revalidate order pages
    revalidatePath('/account/orders')
    revalidatePath(`/account/orders/${saleId}`)

    return {
      success: true,
      sale: updatedSale,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update order status'
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Cancel order and optionally restore stock
 */
export async function cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
  const { saleId, reason, userId, restoreStock = true } = params

  try {
    const payload = await getPayload({ config })

    // Fetch sale with items populated
    const sale = await payload.findByID({
      collection: 'sales',
      id: saleId,
      depth: 2, // Populate items -> books
    })

    if (!sale) {
      return {
        success: false,
        error: 'Order not found',
      }
    }

    // Check if order is already cancelled
    if (sale.status === 'CANCELLED') {
      return {
        success: false,
        error: 'Order is already cancelled',
      }
    }

    // Check if order can be cancelled (only PENDING and PROCESSING can be cancelled)
    if (sale.status === 'COMPLETED' || sale.status === 'REFUNDED') {
      return {
        success: false,
        error: `Cannot cancel order with status ${sale.status}. Please process a refund instead.`,
      }
    }

    const now = new Date().toISOString()

    // Restore stock if requested
    if (restoreStock && sale.items && Array.isArray(sale.items)) {
      for (const item of sale.items) {
        if (typeof item === 'object' && 'book' in item && typeof item.book === 'object') {
          const bookId = item.book.id
          const quantity = item.quantity

          // Re-fetch book to get current stock
          const book = await payload.findByID({
            collection: 'books',
            id: bookId,
          })

          if (book) {
            await payload.update({
              collection: 'books',
              id: bookId,
              data: {
                stockQuantity: book.stockQuantity + quantity,
              },
            })
          }
        }
      }
    }

    // Update sale status to CANCELLED
    const statusHistoryEntry = {
      status: 'CANCELLED' as OrderStatus,
      timestamp: now,
      note: `Order cancelled: ${reason}`,
      changedBy: userId,
    }

    const updatedSale = await payload.update({
      collection: 'sales',
      id: saleId,
      data: {
        status: 'CANCELLED',
        statusHistory: [...(sale.statusHistory || []), statusHistoryEntry],
        cancelledAt: now,
        cancelledBy: userId,
        cancellationReason: reason,
      },
    })

    // Revalidate order pages
    revalidatePath('/account/orders')
    revalidatePath(`/account/orders/${saleId}`)

    return {
      success: true,
      sale: updatedSale,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel order'
    return {
      success: false,
      error: message,
    }
  }
}

/**
 * Get orders for a specific customer
 */
export async function getCustomerOrders(
  params: GetCustomerOrdersParams,
): Promise<GetCustomerOrdersResult> {
  const { customerId, customerEmail, limit = 10, page = 1, status } = params

  try {
    const payload = await getPayload({ config })

    // Build query conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      or: [],
    }

    if (customerId) {
      where.or.push({
        customer: {
          equals: customerId,
        },
      })
    }

    if (customerEmail) {
      where.or.push({
        customerEmail: {
          equals: customerEmail,
        },
      })
    }

    // If no customer identifier provided, return empty
    if (where.or.length === 0) {
      return {
        success: true,
        orders: [],
        totalDocs: 0,
        totalPages: 0,
      }
    }

    // Add status filter if provided
    if (status) {
      where.status = {
        equals: status,
      }
    }

    const { docs, totalDocs, totalPages } = await payload.find({
      collection: 'sales',
      where,
      depth: 2, // Populate items -> books
      limit,
      page,
      sort: '-saleDate', // Most recent first
    })

    return {
      success: true,
      orders: docs,
      totalDocs,
      totalPages,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch orders'
    return {
      success: false,
      orders: [],
      totalDocs: 0,
      totalPages: 0,
      error: message,
    }
  }
}

/**
 * Get single order by ID
 */
export async function getOrderById(saleId: number): Promise<{
  success: boolean
  order?: Sale
  error?: string
}> {
  try {
    const payload = await getPayload({ config })

    const sale = await payload.findByID({
      collection: 'sales',
      id: saleId,
      depth: 3, // Populate items -> books, customer
    })

    return {
      success: true,
      order: sale,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch order'
    return {
      success: false,
      error: message,
    }
  }
}
