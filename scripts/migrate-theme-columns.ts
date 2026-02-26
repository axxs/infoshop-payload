/**
 * Pre-create theme override columns in PostgreSQL before Payload/Drizzle init.
 *
 * Drizzle-kit's push prompts interactively when it can't distinguish new
 * columns from renames. This script adds the columns directly via
 * ALTER TABLE ... ADD COLUMN IF NOT EXISTS, so drizzle push finds them
 * already present and skips the interactive prompt.
 *
 * Also drops legacy "radical_*" and "default_*" columns left over from
 * previous theme iterations, which confuse drizzle-kit into rename prompts.
 *
 * Each statement is wrapped in a DO $$ ... EXCEPTION WHEN undefined_table
 * block so the script is safe on first deploy (tables don't exist yet)
 * and safe to run repeatedly (IF NOT EXISTS / IF EXISTS).
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

  // 1. Add current override columns (IF EXISTS on table handles first-deploy gracefully)
  for (const mode of MODES) {
    for (const token of COLOR_TOKENS) {
      const mainCol = `override_${mode}_${token}`
      const versionCol = `version_override_${mode}_${token}`
      statements.push(
        `DO $$ BEGIN ALTER TABLE _theme ADD COLUMN IF NOT EXISTS "${mainCol}" varchar; EXCEPTION WHEN undefined_table THEN NULL; END $$;`,
      )
      statements.push(
        `DO $$ BEGIN ALTER TABLE _theme_v ADD COLUMN IF NOT EXISTS "${versionCol}" varchar; EXCEPTION WHEN undefined_table THEN NULL; END $$;`,
      )
    }
  }

  for (const field of TYPOGRAPHY_FIELDS) {
    statements.push(
      `DO $$ BEGIN ALTER TABLE _theme ADD COLUMN IF NOT EXISTS "${field}" varchar; EXCEPTION WHEN undefined_table THEN NULL; END $$;`,
    )
    statements.push(
      `DO $$ BEGIN ALTER TABLE _theme_v ADD COLUMN IF NOT EXISTS "version_${field}" varchar; EXCEPTION WHEN undefined_table THEN NULL; END $$;`,
    )
  }

  // 2. Drop legacy columns from previous theme iterations that confuse drizzle-kit
  for (const prefix of LEGACY_PREFIXES) {
    for (const mode of MODES) {
      for (const token of COLOR_TOKENS) {
        statements.push(
          `DO $$ BEGIN ALTER TABLE _theme DROP COLUMN IF EXISTS "${prefix}_${mode}_${token}"; EXCEPTION WHEN undefined_table THEN NULL; END $$;`,
        )
        statements.push(
          `DO $$ BEGIN ALTER TABLE _theme_v DROP COLUMN IF EXISTS "version_${prefix}_${mode}_${token}"; EXCEPTION WHEN undefined_table THEN NULL; END $$;`,
        )
      }
    }

    const legacyTypography = [
      `${prefix}_fontfamily`,
      `${prefix}_headingfontfamily`,
      `${prefix}_dramafontfamily`,
      `${prefix}_radius`,
    ]
    for (const col of legacyTypography) {
      statements.push(
        `DO $$ BEGIN ALTER TABLE _theme DROP COLUMN IF EXISTS "${col}"; EXCEPTION WHEN undefined_table THEN NULL; END $$;`,
      )
      statements.push(
        `DO $$ BEGIN ALTER TABLE _theme_v DROP COLUMN IF EXISTS "version_${col}"; EXCEPTION WHEN undefined_table THEN NULL; END $$;`,
      )
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
    // Log connection info (without credentials) for debugging
    const dbResult = await pool.query('SELECT current_database(), current_schema()')
    const { current_database, current_schema } = dbResult.rows[0]
    console.log(`[migrate] Connected to database: ${current_database}, schema: ${current_schema}`)

    // Each statement uses DO $$ ... EXCEPTION WHEN undefined_table ... $$
    // so it gracefully skips on first deploy when tables don't exist yet
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
