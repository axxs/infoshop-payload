'use client'

import React from 'react'
import type { CartItem } from '../types'

interface POSCartProps {
  cart: CartItem[]
  onUpdateQuantity: (bookId: string, quantity: number) => void
  onRemoveItem: (bookId: string) => void
  onClear: () => void
  onCheckout: () => void
}

export function POSCart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClear,
  onCheckout,
}: POSCartProps) {
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>Shopping Cart</h2>

      {/* Cart Items */}
      <div
        style={{
          border: '1px solid #d1d5db',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          minHeight: '300px',
        }}
      >
        {cart.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            Cart is empty
          </div>
        ) : (
          <div>
            {cart.map((item) => (
              <div
                key={item.bookId}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                    {item.title}
                  </div>
                  {item.author && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>by {item.author}</div>
                  )}
                </div>

                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  {/* Quantity Controls */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={() => onUpdateQuantity(item.bookId, item.quantity - 1)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                      }}
                    >
                      −
                    </button>
                    <span style={{ minWidth: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onUpdateQuantity(item.bookId, item.quantity + 1)}
                      disabled={!item.isDigital && item.quantity >= item.stockAvailable}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.25rem',
                        cursor:
                          !item.isDigital && item.quantity >= item.stockAvailable
                            ? 'not-allowed'
                            : 'pointer',
                        opacity: !item.isDigital && item.quantity >= item.stockAvailable ? 0.5 : 1,
                        fontSize: '0.875rem',
                      }}
                    >
                      +
                    </button>
                  </div>

                  {/* Price and Remove */}
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        ${item.unitPrice.toFixed(2)} × {item.quantity}
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                        {item.priceType === 'MEMBER' ? 'Member' : 'Retail'}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveItem(item.bookId)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        border: 'none',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: '500' }}>Items:</span>
          <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
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
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
        <button
          onClick={onCheckout}
          disabled={cart.length === 0}
          style={{
            padding: '0.75rem',
            backgroundColor: cart.length === 0 ? '#9ca3af' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '1rem',
          }}
        >
          Proceed to Checkout
        </button>
        <button
          onClick={onClear}
          disabled={cart.length === 0}
          style={{
            padding: '0.5rem',
            backgroundColor: 'white',
            color: '#dc2626',
            border: '1px solid #dc2626',
            borderRadius: '0.375rem',
            cursor: cart.length === 0 ? 'not-allowed' : 'pointer',
            opacity: cart.length === 0 ? 0.5 : 1,
          }}
        >
          Clear Cart
        </button>
      </div>
    </div>
  )
}
