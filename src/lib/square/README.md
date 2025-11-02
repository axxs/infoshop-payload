# Square Integration

This directory contains the Square POS integration for card payments and catalog synchronization.

## Overview

The Square integration provides:

- **Payment Processing** - Accept card payments through Square Web Payments SDK
- **Catalog Sync** - Synchronize book inventory to Square catalog
- **Refunds** - Process payment refunds

## Configuration

### Environment Variables

Add these to your `.env.local`:

```bash
# Square API Configuration
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_ENVIRONMENT=sandbox  # or 'production'

# Public configuration (for Web Payments SDK)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=your-application-id
NEXT_PUBLIC_SQUARE_LOCATION_ID=your-location-id
```

### Getting Square Credentials

1. **Create a Square Account** - Sign up at https://squareup.com
2. **Get API Credentials** - Visit https://developer.squareup.com/apps
3. **Create an Application** - Or use an existing one
4. **Copy Credentials**:
   - Access Token: From "Credentials" tab (use Sandbox for testing)
   - Application ID: From "Credentials" tab
   - Location ID: From your Square Dashboard

## Files

### Core Services

- **`client.ts`** - Square SDK client initialization and configuration
- **`payments.ts`** - Payment processing, refunds, and payment retrieval
- **`catalogSync.ts`** - Inventory synchronization to Square catalog

### React Components

- **`SquarePaymentForm.tsx`** - Client-side payment form using Square Web Payments SDK

### API Routes

- **`/api/square/payments`** - Process card payments
- **`/api/square/sync`** - Sync books to Square catalog

## Usage

### Processing Payments (Backend)

```typescript
import { processPayment } from '@/lib/square/payments'

const result = await processPayment({
  sourceId: 'card-token-from-frontend',
  amount: 29.99, // Amount in dollars
  currency: 'USD',
  referenceId: 'SALE-123', // Optional
  customerId: 'customer-id', // Optional
})

if (result.success) {
  console.log('Payment successful:', result.transactionId)
  console.log('Receipt URL:', result.receiptUrl)
} else {
  console.error('Payment failed:', result.error)
}
```

### Processing Refunds

```typescript
import { refundPayment } from '@/lib/square/payments'

const result = await refundPayment(
  'payment-id',
  29.99, // Amount to refund in dollars
  'Customer requested refund', // Optional reason
)

if (result.success) {
  console.log('Refund successful:', result.transactionId)
}
```

### Using the Payment Form (Frontend)

```typescript
import { SquarePaymentForm } from '@/lib/square/SquarePaymentForm'

<SquarePaymentForm
  amount={29.99}
  onPaymentSuccess={(transactionId, receiptUrl) => {
    console.log('Payment successful!', transactionId)
    // Update your UI, create sale record, etc.
  }}
  onPaymentError={(error) => {
    console.error('Payment failed:', error)
  }}
  onCancel={() => {
    // Handle cancellation
  }}
/>
```

### Syncing Catalog

```typescript
// Sync all unsynced books
const response = await fetch('/api/square/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ strategy: 'unsynced' }),
})

const result = await response.json()
console.log(`Synced ${result.itemsCreated} items`)
```

## Payment Flow

### 1. Frontend (POS Interface)

When user selects Square payment:

1. SquarePaymentForm component loads Square Web Payments SDK
2. User enters card details in secure Square iframe
3. On submit, Square tokenizes the card (creates a one-time-use token)
4. Token is sent to your backend API

### 2. Backend (API Route)

Your `/api/square/payments` endpoint:

1. Receives the card token (sourceId)
2. Calls `processPayment()` from `payments.ts`
3. Square processes the payment
4. Returns transaction ID and receipt URL

### 3. POS Integration

After successful payment:

1. Create SaleItems in Payload
2. Create Sale record with Square transaction ID
3. Collection hooks automatically deduct stock
4. Show receipt to customer

## Security

### Best Practices

1. **Never expose Access Token** - Only use in server-side code
2. **Use HTTPS in production** - Required for Square Web Payments SDK
3. **Validate amounts** - Always validate payment amounts server-side
4. **Idempotency keys** - Automatically generated to prevent duplicate charges
5. **PCI Compliance** - Card data never touches your server (handled by Square)

### Sandbox vs Production

- **Sandbox** - Use for development/testing
  - Test card: `4111 1111 1111 1111`
  - Any future expiry date
  - Any CVV

- **Production** - Use for live transactions
  - Real cards only
  - Real charges
  - Requires PCI compliance

## Error Handling

All payment functions return a consistent error format:

```typescript
{
  success: false,
  error: "Descriptive error message"
}
```

Common errors:

- `SQUARE_ACCESS_TOKEN environment variable is not set` - Missing configuration
- `Card tokenization failed` - Invalid card details
- `Insufficient funds` - Card declined
- `Payment processing failed` - General Square API error

## Testing

### Test Cards (Sandbox Only)

Square provides test cards for sandbox testing:

- **Success**: 4111 1111 1111 1111
- **Decline**: 4000 0000 0000 0002
- **CVV Fail**: Use CVV 999

All test cards:

- Expiry: Any future date
- CVV: Any 3 digits (except for specific test scenarios)
- ZIP: Any valid ZIP code

### Integration Tests

```typescript
// Example: Test payment processing
import { processPayment } from '@/lib/square/payments'

test('process payment successfully', async () => {
  const result = await processPayment({
    sourceId: 'cnon:card-nonce-ok', // Test nonce
    amount: 10.0,
  })

  expect(result.success).toBe(true)
  expect(result.transactionId).toBeDefined()
})
```

## Troubleshooting

### "Square SDK not loaded"

Make sure Square script is accessible:

- Check network tab for 404 errors
- Verify HTTPS in production
- Check Content Security Policy (CSP) settings

### "Card tokenization failed"

- Verify card details are complete
- Check sandbox vs production environment
- Ensure location ID matches environment

### "Payment processing failed"

- Verify Access Token is valid
- Check Access Token matches environment (sandbox/production)
- Review Square API logs in developer dashboard

## API Reference

### `processPayment(params)`

Process a card payment.

**Parameters:**

- `sourceId` (string, required) - Card token from Square Web Payments SDK
- `amount` (number, required) - Payment amount in dollars
- `currency` (Currency, optional) - Currency code (default: 'USD')
- `referenceId` (string, optional) - Your internal reference ID
- `note` (string, optional) - Payment note
- `customerId` (string, optional) - Square customer ID

**Returns:** `Promise<PaymentResult>`

### `refundPayment(paymentId, amount, reason?)`

Refund a payment.

**Parameters:**

- `paymentId` (string, required) - Square payment ID to refund
- `amount` (number, required) - Amount to refund in dollars
- `reason` (string, optional) - Refund reason

**Returns:** `Promise<PaymentResult>`

### `getPayment(paymentId)`

Retrieve payment details.

**Parameters:**

- `paymentId` (string, required) - Square payment ID

**Returns:** `Promise<Payment | null>`

### `cancelPayment(paymentId)`

Cancel/void a payment (if not yet completed).

**Parameters:**

- `paymentId` (string, required) - Square payment ID

**Returns:** `Promise<boolean>`

## Resources

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Web Payments SDK](https://developer.squareup.com/docs/web-payments/overview)
- [Payments API](https://developer.squareup.com/docs/payments-api/overview)
- [Node.js SDK](https://developer.squareup.com/docs/sdks/nodejs)

## Support

For Square API issues:

- Developer Forums: https://developer.squareup.com/forums
- Support: https://squareup.com/help/contact

For integration issues with this codebase:

- Check the MIGRATION_ROADMAP.md for context
- Review the POS implementation in `src/app/(payload)/admin/pos/`
