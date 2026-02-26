/**
 * Push database schema to PostgreSQL on startup.
 *
 * Payload's built-in `push` only runs when NODE_ENV !== 'production'.
 * This script is invoked with NODE_ENV unset so the push executes,
 * then the standalone server starts with NODE_ENV=production.
 *
 * Safe to run on every deploy — drizzle-kit's pushSchema is idempotent.
 *
 * Set SKIP_SCHEMA_PUSH=true to bypass (useful when drizzle-kit needs
 * interactive input that isn't available in Docker).
 */
import { getPayload } from 'payload'
import config from './payload.config'

async function pushSchema(): Promise<void> {
  if (process.env.SKIP_SCHEMA_PUSH === 'true') {
    console.log('[push-schema] Skipping schema push (SKIP_SCHEMA_PUSH=true)')
    process.exit(0)
  }

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
