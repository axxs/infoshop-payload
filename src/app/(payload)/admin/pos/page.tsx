'use client'

import React, { useState } from 'react'
import { POSSearch } from './components/POSSearch'
import { POSCart } from './components/POSCart'
import { POSCheckout } from './components/POSCheckout'
import type { CartItem } from './types'

/**
 * Point of Sale (POS) Interface
 * Custom admin page for processing in-store sales
 */
export default function POSPage() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCheckout, setShowCheckout] = useState(false)

  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => {
      // Check if item already in cart
      const existingIndex = prev.findIndex((i) => i.bookId === item.bookId)

      if (existingIndex >= 0) {
        // Update quantity
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + item.quantity,
        }
        return updated
      }

      // Add new item
      return [...prev, item]
    })
  }

  const handleUpdateQuantity = (bookId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(bookId)
      return
    }

    setCart((prev) => prev.map((item) => (item.bookId === bookId ? { ...item, quantity } : item)))
  }

  const handleRemoveItem = (bookId: string) => {
    setCart((prev) => prev.filter((item) => item.bookId !== bookId))
  }

  const handleClearCart = () => {
    setCart([])
    setShowCheckout(false)
  }

  const handleCheckout = () => {
    setShowCheckout(true)
  }

  const handleCheckoutComplete = () => {
    setCart([])
    setShowCheckout(false)
  }

  const handleCheckoutCancel = () => {
    setShowCheckout(false)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>Point of Sale</h1>

      {showCheckout ? (
        <POSCheckout
          cart={cart}
          onComplete={handleCheckoutComplete}
          onCancel={handleCheckoutCancel}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Left: Product Search */}
          <div>
            <POSSearch onAddToCart={handleAddToCart} />
          </div>

          {/* Right: Shopping Cart */}
          <div>
            <POSCart
              cart={cart}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClear={handleClearCart}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      )}
    </div>
  )
}
