'use client'

import React, { useEffect, useState, useRef } from 'react'

/**
 * Square SDK Type Definitions
 */
interface SquareCard {
  attach: (elementId: string) => Promise<void>
  tokenize: () => Promise<TokenizeResult>
  destroy: () => Promise<void>
}

interface TokenizeResult {
  status: 'OK' | 'INVALID' | 'CANCEL'
  token?: string
  errors?: Array<{ message: string; field?: string }>
}

interface SquarePayments {
  card: () => Promise<SquareCard>
}

interface SquareSDK {
  payments: (appId: string, locationId: string) => SquarePayments
}

interface SquareWindow extends Window {
  Square?: SquareSDK
}

declare const window: SquareWindow

/**
 * Component Props
 */
interface SquarePaymentFormProps {
  amount: number
  currency?: 'AUD' | 'USD' | 'EUR' | 'GBP' | 'CAD' | 'NZD'
  onPaymentSuccess: (transactionId: string, receiptUrl?: string) => void
  onPaymentError: (error: string) => void
  onCancel: () => void
}

/**
 * Square Web Payments SDK Payment Form
 * Handles card payment collection and tokenization
 *
 * Note: Requires NEXT_PUBLIC_SQUARE_APPLICATION_ID and NEXT_PUBLIC_SQUARE_LOCATION_ID
 * environment variables to be set
 */
export function SquarePaymentForm({
  amount,
  currency = 'AUD',
  onPaymentSuccess,
  onPaymentError,
  onCancel,
}: SquarePaymentFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cardInstance, setCardInstance] = useState<SquareCard | null>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadSquareSDK = async () => {
      try {
        // Check if Square script is already loaded
        if (window.Square) {
          await initializeSquarePayments()
          return
        }

        // Load Square Web Payments SDK
        const script = document.createElement('script')
        script.src = 'https://web.squarecdn.com/v1/square.js'
        script.async = true
        script.onload = async () => {
          if (isMounted) {
            await initializeSquarePayments()
          }
        }
        script.onerror = () => {
          if (isMounted) {
            setError('Failed to load Square Payments SDK')
            setIsLoading(false)
          }
        }

        scriptRef.current = script
        document.body.appendChild(script)
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize Square payments')
          setIsLoading(false)
        }
      }
    }

    loadSquareSDK()

    // Cleanup function
    return () => {
      isMounted = false

      // Destroy card instance
      if (cardInstance) {
        cardInstance.destroy().catch(() => {
          // Ignore errors during cleanup
        })
      }

      // Remove script tag
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current)
      }
    }
    // Intentionally run once on mount. cardInstance is managed via state setter
    // and cleanup closure captures the current instance at unmount time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initializeSquarePayments = async () => {
    try {
      const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
      const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID

      if (!applicationId || !locationId) {
        throw new Error('Square configuration missing. Check environment variables.')
      }

      const Square = window.Square
      if (!Square) {
        throw new Error('Square SDK not loaded')
      }

      const payments = Square.payments(applicationId, locationId)
      const card = await payments.card()
      await card.attach('#card-container')

      setCardInstance(card)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize card form')
      setIsLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!cardInstance) {
      setError('Card form not initialized')
      return
    }

    setIsProcessing(true)
    setError(null)

    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

    try {
      // Tokenize card
      const result = await cardInstance.tokenize()

      if (result.status === 'OK') {
        const sourceId = result.token

        // Send to our API endpoint to process payment
        const response = await fetch('/api/square/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId,
            amount,
            currency,
          }),
          signal: controller.signal,
        })

        const data = await response.json()

        if (data.success) {
          onPaymentSuccess(data.transactionId, data.receiptUrl)
        } else {
          setError(data.error || 'Payment processing failed')
          onPaymentError(data.error || 'Payment processing failed')
        }
      } else {
        const errors = result.errors?.map((e) => e.message).join(', ')
        setError(errors || 'Card tokenization failed')
        onPaymentError(errors || 'Card tokenization failed')
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        const timeoutMessage = 'Payment request timed out. Please try again.'
        setError(timeoutMessage)
        onPaymentError(timeoutMessage)
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Payment processing failed'
        setError(errorMessage)
        onPaymentError(errorMessage)
      }
    } finally {
      clearTimeout(timeoutId)
      setIsProcessing(false)
    }
  }

  return (
    <div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Card Payment</h3>

      {isLoading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          Loading payment form...
        </div>
      )}

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

      {/* Square Card Container */}
      <div
        id="card-container"
        style={{
          marginBottom: '1.5rem',
          minHeight: '150px',
        }}
      />

      {/* Payment Summary */}
      {!isLoading && (
        <div
          style={{
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.125rem',
              fontWeight: '600',
            }}
          >
            <span>Total to charge:</span>
            <span>${amount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!isLoading && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handlePayment}
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
            {isProcessing ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
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
      )}
    </div>
  )
}
