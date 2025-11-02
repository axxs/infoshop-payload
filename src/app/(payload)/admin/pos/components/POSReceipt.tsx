'use client'

import React, { useRef } from 'react'
import type { CartItem, PaymentMethod } from '../types'

interface POSReceiptProps {
  receiptNumber: string
  saleDate: string
  items: CartItem[]
  totalAmount: number
  paymentMethod: PaymentMethod
  onClose: () => void
}

export function POSReceipt({
  receiptNumber,
  saleDate,
  items,
  totalAmount,
  paymentMethod,
  onClose,
}: POSReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        const doc = printWindow.document

        // Create HTML structure using DOM methods
        const html = doc.createElement('html')
        const head = doc.createElement('head')
        const title = doc.createElement('title')
        const style = doc.createElement('style')
        const body = doc.createElement('body')

        title.textContent = `Receipt ${receiptNumber}`
        style.textContent = `
          body {
            font-family: monospace;
            padding: 20px;
            max-width: 400px;
            margin: 0 auto;
          }
          .receipt-header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .receipt-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .receipt-info {
            font-size: 12px;
            margin-bottom: 15px;
          }
          .receipt-items {
            border-bottom: 2px dashed #000;
            padding-bottom: 10px;
            margin-bottom: 10px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-size: 13px;
          }
          .item-details {
            font-size: 11px;
            color: #666;
            margin-left: 10px;
            margin-bottom: 8px;
          }
          .receipt-total {
            font-size: 16px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 2px solid #000;
          }
          .receipt-footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            border-top: 2px dashed #000;
            padding-top: 10px;
          }
          @media print {
            body { padding: 0; }
          }
        `

        head.appendChild(title)
        head.appendChild(style)

        // Clone the receipt content
        if (receiptRef.current) {
          const clonedContent = receiptRef.current.cloneNode(true) as HTMLElement
          body.appendChild(clonedContent)
        }

        html.appendChild(head)
        html.appendChild(body)

        doc.appendChild(html)
        doc.close()

        printWindow.focus()
        printWindow.print()
        printWindow.close()
      }
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
          Sale Complete
        </h2>

        {/* Receipt Preview */}
        <div
          ref={receiptRef}
          style={{
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            backgroundColor: '#fafafa',
            fontFamily: 'monospace',
          }}
        >
          <div className="receipt-header">
            <div className="receipt-title">INFOSHOP</div>
            <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Independent Bookstore</div>
          </div>

          <div className="receipt-info" style={{ marginBottom: '1rem', fontSize: '0.8rem' }}>
            <div>Receipt: {receiptNumber}</div>
            <div>Date: {new Date(saleDate).toLocaleString()}</div>
            <div>Payment: {paymentMethod.replace('_', ' ')}</div>
          </div>

          <div className="receipt-items" style={{ marginBottom: '1rem' }}>
            {items.map((item, index) => (
              <div key={index} style={{ marginBottom: '0.75rem' }}>
                <div
                  className="item-row"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                  }}
                >
                  <span style={{ fontWeight: '600' }}>{item.title}</span>
                  <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                </div>
                <div className="item-details" style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {item.author && <span>{item.author} • </span>}${item.unitPrice.toFixed(2)} ×{' '}
                  {item.quantity} ({item.priceType})
                </div>
              </div>
            ))}
          </div>

          <div
            className="receipt-total"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.125rem',
              fontWeight: '700',
              paddingTop: '0.75rem',
              borderTop: '2px solid #000',
            }}
          >
            <span>TOTAL</span>
            <span>${totalAmount.toFixed(2)}</span>
          </div>

          <div
            className="receipt-footer"
            style={{
              textAlign: 'center',
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px dashed #d1d5db',
              fontSize: '0.75rem',
              color: '#6b7280',
            }}
          >
            <div>Thank you for your purchase!</div>
            <div style={{ marginTop: '0.25rem' }}>Visit us again soon</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handlePrint}
            style={{
              flex: 1,
              padding: '0.75rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Print Receipt
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            New Sale
          </button>
        </div>
      </div>
    </div>
  )
}
