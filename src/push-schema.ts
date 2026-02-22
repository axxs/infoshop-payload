/**
 * Push database schema to PostgreSQL on startup.
 *
 * Payload's built-in `push` only runs when NODE_ENV !== 'production'.
 * This script is invoked with NODE_ENV unset so the push executes,
 * then the standalone server starts with NODE_ENV=production.
 *
 * Safe to run on every deploy — drizzle-kit's pushSchema is idempotent.
 */
import { getPayload } from 'payload'
import config from './payload.config'

async function pushSchema(): Promise<void> {
  console.log('[push-schema] Pushing database schema...')
  const payload = await getPayload({ config })
  console.log('[push-schema] Schema pushed successfully')
  if (payload.db?.destroy) {
    await payload.db.destroy()
  }
  process.exit(0)
}

pushSchema().catch((error: unknown) => {
  console.error('[push-schema] Schema push failed:', error)
  process.exit(1)
})
