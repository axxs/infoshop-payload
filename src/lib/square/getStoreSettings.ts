import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import type { StoreSetting } from '@/payload-types'

interface StorePaymentSettings {
  paymentsEnabled: boolean
  paymentsDisabledMessage: string
}

const DEFAULT_DISABLED_MESSAGE =
  'Online payments are currently unavailable. You can submit an inquiry and we will get back to you.'

const getCachedSettings = unstable_cache(
  async (): Promise<StorePaymentSettings> => {
    try {
      const payload = await getPayload({ config })
      const settings: StoreSetting = await payload.findGlobal({ slug: 'store-settings' })

      return {
        paymentsEnabled: settings.paymentsEnabled ?? true,
        paymentsDisabledMessage: settings.paymentsDisabledMessage || DEFAULT_DISABLED_MESSAGE,
      }
    } catch {
      // Global may not exist yet (first run). Fall back to defaults (payments enabled).
      return {
        paymentsEnabled: true,
        paymentsDisabledMessage: DEFAULT_DISABLED_MESSAGE,
      }
    }
  },
  ['store-payment-settings'],
  { revalidate: 30, tags: ['store-payment-settings'] },
)

export async function getStorePaymentSettings(): Promise<StorePaymentSettings> {
  return getCachedSettings()
}
