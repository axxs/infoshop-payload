# Square Integration

This directory contains the Square POS integration for card payments and catalog synchronization.

## Overview

The Square integration provides:

- **Payment Processing** — Accept card payments through Square Web Payments SDK
- **Catalog Sync** — Synchronize book inventory to Square catalog
- **Refunds** — Process payment refunds

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

Square configuration status is visible in the admin panel under **Store Settings**.

### Getting Square Credentials

1. **Create a Square Account** — Sign up at https://squareup.com
2. **Get API Credentials** — Visit https://developer.squareup.com/apps
3. **Create an Application** — Or use an existing one
4. **Copy Credentials**:
   - Access Token: From "Credentials" tab (use Sandbox for testing)
   - Application ID: From "Credentials" tab
   - Location ID: From your Square Dashboard

## Files

### Core Services

- **`client.ts`** — Square SDK client initialization and configuration
- **`payments.ts`** — Payment processing, refunds, and payment retrieval
- **`catalogSync.ts`** — Inventory synchronization to Square catalog
- **`constants.ts`** — Shared constants (default currency AUD, max amounts, SDK URLs)
- **`getStoreSettings.ts`** — Cached read of StoreSettings global for payment toggle

### React Components

- **`SquarePaymentForm.tsx`** — Client-side payment form using Square Web Payments SDK

### API Routes

- **`/api/square/payments`** — Process card payments (public, rate-limited 5/min/IP)
- **`/api/square/sync`** — Sync books to Square catalog (admin only)

## Usage

### Processing Payments (Backend)

```typescript
import { processPayment } from '@/lib/square/payments'

const result = await processPayment({
  sourceId: 'card-token-from-frontend',
  amount: 29.99, // Amount in dollars (converted to cents internally)
  currency: 'AUD', // Default: AUD
  referenceId: 'SALE-123', // Optional
  note: 'Book purchase', // Optional
})

if (result.success) {
  console.log('Payment successful:', result.transactionId)
  console.log('Receipt URL:', result.receiptUrl)
} else {
  console.error('Payment failed:', result.error)
}
```

**Note**: The `/api/square/payments` route only passes `sourceId`, `amount`, and `currency` to `processPayment`. Fields like `referenceId`, `note`, and `customerId` are set by the server-side checkout flow (`processCheckout` in `src/lib/checkout/actions.ts`), not by the client.

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
  }}
  onPaymentError={(error) => {
    console.error('Payment failed:', error)
  }}
  onCancel={() => {
    // Handle cancellation
  }}
/>
```

The payment form sends `credentials: 'include'` so that logged-in users' auth cookies are forwarded, allowing `processCheckout` to link orders to their account.

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

### 1. Frontend (Checkout Page)

1. SquarePaymentForm component loads Square Web Payments SDK
2. User enters card details in secure Square iframe
3. On submit, Square tokenizes the card (creates a one-time-use token)
4. Token is sent to `/api/square/payments`

### 2. Backend (API Route)

The `/api/square/payments` endpoint:

1. Rate-limits (5 attempts/min/IP)
2. Checks `paymentsEnabled` via StoreSettings (returns 503 if disabled)
3. Validates inputs (sourceId, amount)
4. Calls `processPayment()` with sourceId, amount, currency
5. Returns transaction ID and receipt URL

**No auth required** — anonymous checkout is supported.

### 3. Checkout Integration

After successful payment (`processCheckout` in `src/lib/checkout/actions.ts`):

1. Verifies payment with Square (amount, currency, status)
2. Creates Sale record with Square transaction ID
3. Creates SaleItems from cart
4. Collection hooks automatically deduct stock
5. Clears cart cookie
6. Redirects to success page

## Store Settings Integration

Payments can be toggled on/off in the admin panel (**Store Settings → Enable Card Payments**).

When payments are disabled:
- `/api/square/payments` returns 503
- Checkout page shows inquiry form instead of payment form
- Inquiry submissions go to the Inquiries collection

Settings are cached with Next.js `unstable_cache` and invalidated via `revalidateTag` on change.

## Security

### Best Practices

1. **Never expose Access Token** — Only use in server-side code
2. **Use HTTPS in production** — Required for Square Web Payments SDK
3. **Validate amounts** — Always validate payment amounts server-side
4. **Idempotency keys** — Automatically generated to prevent duplicate charges
5. **PCI Compliance** — Card data never touches your server (handled by Square)
6. **Rate limiting** — 5 payment attempts per minute per IP

### Sandbox vs Production

- **Sandbox** — Use for development/testing
  - Test card: `4111 1111 1111 1111`
  - Any future expiry date
  - Any CVV

- **Production** — Use for live transactions
  - Real cards only
  - Real charges

## Error Handling

All payment functions return a consistent format:

```typescript
{
  success: false,
  error: "Descriptive error message"
}
```

Common errors:

- `SQUARE_ACCESS_TOKEN environment variable is not set` — Missing configuration
- `Card tokenization failed` — Invalid card details
- `Insufficient funds` — Card declined
- `Online payments are currently disabled` — StoreSettings has payments off
- `Too many payment attempts` — Rate limit exceeded

## API Reference

### `processPayment(params)`

Process a card payment.

**Parameters:**

- `sourceId` (string, required) — Card token from Square Web Payments SDK
- `amount` (number, required) — Payment amount in dollars
- `currency` (Currency, optional) — Currency code (default: 'AUD')
- `referenceId` (string, optional) — Internal reference ID
- `note` (string, optional) — Payment note
- `customerId` (string, optional) — Square customer ID

**Returns:** `Promise<PaymentResult>`

### `refundPayment(paymentId, amount, reason?)`

Refund a payment.

**Parameters:**

- `paymentId` (string, required) — Square payment ID to refund
- `amount` (number, required) — Amount to refund in dollars
- `reason` (string, optional) — Refund reason

**Returns:** `Promise<PaymentResult>`

### `getPayment(paymentId)`

Retrieve payment details.

**Returns:** `Promise<Payment | null>`

### `cancelPayment(paymentId)`

Cancel/void a payment (if not yet completed).

**Returns:** `Promise<boolean>`

## Resources

- [Square Developer Documentation](https://developer.squareup.com/docs)
- [Web Payments SDK](https://developer.squareup.com/docs/web-payments/overview)
- [Payments API](https://developer.squareup.com/docs/payments-api/overview)
- [Node.js SDK](https://developer.squareup.com/docs/sdks/nodejs)
