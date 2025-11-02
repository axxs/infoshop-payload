/**
 * Square API Client Configuration
 * Initializes the Square SDK with environment-based settings
 */

import { SquareClient, SquareEnvironment } from 'square'

/**
 * Initialize Square client with credentials from environment variables
 */
export function getSquareClient(): SquareClient {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('SQUARE_ACCESS_TOKEN environment variable is not set')
  }

  const environment =
    process.env.SQUARE_ENVIRONMENT === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox

  return new SquareClient({
    token: accessToken,
    environment,
  })
}

/**
 * Generate UUID v4 for idempotency keys
 */
export function generateIdempotencyKey(): string {
  return crypto.randomUUID()
}
