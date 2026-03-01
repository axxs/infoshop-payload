'use server'

import { getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

export interface SquareConfigStatusData {
  environment: 'sandbox' | 'production'
  hasAccessToken: boolean
  hasApplicationId: boolean
  applicationIdPrefix: string
  hasLocationId: boolean
  hasSyncApiKey: boolean
  isReady: boolean
}

export async function getSquareConfigStatus(): Promise<SquareConfigStatusData> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user || (user as { role?: string }).role !== 'admin') {
    throw new Error('Unauthorized')
  }

  const environment =
    process.env.SQUARE_ENVIRONMENT === 'production' ? 'production' : 'sandbox'

  const hasAccessToken = !!process.env.SQUARE_ACCESS_TOKEN
  const hasApplicationId = !!process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
  const applicationIdPrefix = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID
    ? process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID.substring(0, 10) + '...'
    : ''
  const hasLocationId = !!process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID
  const hasSyncApiKey = !!process.env.SQUARE_SYNC_API_KEY

  const isReady = hasAccessToken && hasApplicationId && hasLocationId

  return {
    environment,
    hasAccessToken,
    hasApplicationId,
    applicationIdPrefix,
    hasLocationId,
    hasSyncApiKey,
    isReady,
  }
}
