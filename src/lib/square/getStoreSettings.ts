import { getPayload } from 'payload'
import config from '@payload-config'
import type { StoreSetting } from '@/payload-types'

interface StorePaymentSettings {
  paymentsEnabled: boolean
  paymentsDisabledMessage: string
}

const DEFAULT_DISABLED_MESSAGE =
  'Online payments are currently unavailable. You can submit an inquiry and we will get back to you.'

export async function getStorePaymentSettings(): Promise<StorePaymentSettings> {
  try {
    const payload = await getPayload({ config })
    const settings: StoreSetting = await payload.findGlobal({ slug: 'store-settings' })

    return {
      paymentsEnabled: settings.paymentsEnabled ?? true,
      paymentsDisabledMessage: settings.paymentsDisabledMessage || DEFAULT_DISABLED_MESSAGE,
    }
  } catch {
    // Fall back to enabled if the global doesn't exist yet
    return {
      paymentsEnabled: true,
      paymentsDisabledMessage: DEFAULT_DISABLED_MESSAGE,
    }
  }
}
