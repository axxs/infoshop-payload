'use client'

import React, { useState } from 'react'
import type { CartItem, PaymentMethod } from '../types'
import { POSReceipt } from './POSReceipt'

interface POSCheckoutProps {
  cart: CartItem[]
  onComplete: () => void
  onCancel: () => void
}

interface SaleReceipt {
  receiptNumber: string
  saleDate: string
  totalAmount: number
}

export function POSCheckout({ cart, onComplete, onCancel }: POSCheckoutProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState<string>('')
  const [saleReceipt, setSaleReceipt] = useState<SaleReceipt | null>(null)

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  const handleCompleteSale = async () => {
    setIsProcessing(true)
    setError(null)

    try {
      // Step 1: Create sale items
      const saleItemIds: string[] = []

      for (const cartItem of cart) {
        const saleItemResponse = await fetch('/api/sale-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            book: cartItem.bookId,
            quantity: cartItem.quantity,
            unitPrice: cartItem.unitPrice,
            priceType: cartItem.priceType,
            discount: 0,
          }),
        })

        if (!saleItemResponse.ok) {
          const errorData = await saleItemResponse.json()
          throw new Error(errorData.message || 'Failed to create sale item')
        }

        const saleItem = await saleItemResponse.json()
        saleItemIds.push(saleItem.doc.id)
      }

      // Step 2: Create sale with the sale items
      const saleData = {
        saleDate: new Date().toISOString(),
        paymentMethod,
        items: saleItemIds,
        ...(customerId && { customer: customerId }),
      }

      const saleResponse = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData),
      })

      if (!saleResponse.ok) {
        const errorData = await saleResponse.json()
        throw new Error(errorData.message || 'Failed to create sale')
      }

      const sale = await saleResponse.json()

      // Success - Show receipt
      setSaleReceipt({
        receiptNumber: sale.doc.receiptNumber,
        saleDate: sale.doc.saleDate,
        totalAmount: sale.doc.totalAmount,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during checkout')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReceiptClose = () => {
    setSaleReceipt(null)
    onComplete()
  }

  // Show receipt if sale completed
  if (saleReceipt) {
    return (
      <POSReceipt
        receiptNumber={saleReceipt.receiptNumber}
        saleDate={saleReceipt.saleDate}
        items={cart}
        totalAmount={saleReceipt.totalAmount}
        paymentMethod={paymentMethod}
        onClose={handleReceiptClose}
      />
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Checkout</h2>

      {/* Order Summary */}
      <div
        style={{
          border: '1px solid #d1d5db',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#f9fafb',
        }}
      >
        <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Order Summary</h3>
        <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          {cart.map((item) => (
            <div
              key={item.bookId}
              style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}
            >
              <span>
                {item.title} × {item.quantity}
              </span>
              <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '1.25rem',
            fontWeight: '600',
            paddingTop: '0.5rem',
            borderTop: '2px solid #d1d5db',
          }}
        >
          <span>Total:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Customer Selection (Optional) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          htmlFor="customer"
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}
        >
          Customer (Optional)
        </label>
        <input
          id="customer"
          type="text"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="Customer ID (leave blank for walk-in)"
          style={{
            width: '100%',
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
          }}
        />
      </div>

      {/* Payment Method Selection */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Payment Method
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          {(['CASH', 'CARD', 'SQUARE', 'MEMBER_CREDIT', 'OTHER'] as PaymentMethod[]).map(
            (method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  backgroundColor: paymentMethod === method ? '#3b82f6' : 'white',
                  color: paymentMethod === method ? 'white' : 'black',
                  cursor: 'pointer',
                  fontWeight: paymentMethod === method ? '600' : 'normal',
                }}
              >
                {method.replace('_', ' ')}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleCompleteSale}
          disabled={isProcessing}
          style={{
            flex: 1,
            padding: '0.75rem',
            backgroundColor: isProcessing ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
          }}
        >
          {isProcessing ? 'Processing...' : `Complete Sale ($${subtotal.toFixed(2)})`}
        </button>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'white',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            opacity: isProcessing ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
