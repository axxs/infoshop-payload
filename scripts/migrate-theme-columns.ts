/**
 * Pre-create theme override columns in PostgreSQL before Payload/Drizzle init.
 *
 * Drizzle-kit's push prompts interactively when it can't distinguish new
 * columns from renames. This script adds the columns directly with
 * ALTER TABLE ... ADD COLUMN IF NOT EXISTS, so drizzle push finds them
 * already present and skips the interactive prompt.
 *
 * Also drops legacy "radical_*" columns left over from a previous theme
 * iteration, which otherwise confuse drizzle-kit into rename prompts.
 *
 * Safe to run repeatedly — IF NOT EXISTS / IF EXISTS make it idempotent.
 */
import pg from 'pg'

const COLOR_TOKENS = [
  'primary',
  'primary_foreground',
  'secondary',
  'secondary_foreground',
  'background',
  'foreground',
  'card',
  'card_foreground',
  'popover',
  'popover_foreground',
  'muted',
  'muted_foreground',
  'accent',
  'accent_foreground',
  'destructive',
  'destructive_foreground',
  'border',
  'input',
  'ring',
]

const MODES = ['light', 'dark'] as const

const TYPOGRAPHY_FIELDS = [
  'override_fontfamily',
  'override_headingfontfamily',
  'override_dramafontfamily',
  'override_radius',
]

/** Legacy column prefixes from previous theme iterations */
const LEGACY_PREFIXES = ['radical', 'default']

function buildStatements(): string[] {
  const statements: string[] = []

  // 1. Add current override columns
  for (const mode of MODES) {
    for (const token of COLOR_TOKENS) {
      const mainCol = `override_${mode}_${token}`
      const versionCol = `version_override_${mode}_${token}`
      statements.push(`ALTER TABLE _theme ADD COLUMN IF NOT EXISTS "${mainCol}" varchar;`)
      statements.push(`ALTER TABLE _theme_v ADD COLUMN IF NOT EXISTS "${versionCol}" varchar;`)
    }
  }

  for (const field of TYPOGRAPHY_FIELDS) {
    statements.push(`ALTER TABLE _theme ADD COLUMN IF NOT EXISTS "${field}" varchar;`)
    statements.push(`ALTER TABLE _theme_v ADD COLUMN IF NOT EXISTS "version_${field}" varchar;`)
  }

  // 2. Drop legacy columns from previous theme iterations that confuse drizzle-kit
  for (const prefix of LEGACY_PREFIXES) {
    for (const mode of MODES) {
      for (const token of COLOR_TOKENS) {
        statements.push(`ALTER TABLE _theme DROP COLUMN IF EXISTS "${prefix}_${mode}_${token}";`)
        statements.push(`ALTER TABLE _theme_v DROP COLUMN IF EXISTS "version_${prefix}_${mode}_${token}";`)
      }
    }

    const legacyTypography = [
      `${prefix}_fontfamily`,
      `${prefix}_headingfontfamily`,
      `${prefix}_dramafontfamily`,
      `${prefix}_radius`,
    ]
    for (const col of legacyTypography) {
      statements.push(`ALTER TABLE _theme DROP COLUMN IF EXISTS "${col}";`)
      statements.push(`ALTER TABLE _theme_v DROP COLUMN IF EXISTS "version_${col}";`)
    }
  }

  return statements
}

async function migrate(): Promise<void> {
  const connectionString = process.env.DATABASE_URI
  if (!connectionString?.startsWith('postgres')) {
    console.log('[migrate] Not a PostgreSQL database, skipping column migration')
    return
  }

  const pool = new pg.Pool({ connectionString })

  try {
    // Check if the _theme table exists before trying to alter it
    const tableCheck = await pool.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '_theme')`,
    )
    if (!tableCheck.rows[0].exists) {
      console.log('[migrate] _theme table does not exist yet, skipping (first deploy)')
      return
    }

    const statements = buildStatements()
    console.log(`[migrate] Running ${statements.length} schema statements...`)

    for (const sql of statements) {
      await pool.query(sql)
    }

    console.log('[migrate] Column migration complete')
  } finally {
    await pool.end()
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[migrate] Migration failed:', error)
    process.exit(1)
  })
