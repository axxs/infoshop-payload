/**
 * Pre-create Pages/Posts related columns and tables in PostgreSQL before
 * Payload/Drizzle init.
 *
 * Drizzle-kit's push prompts interactively when it detects new enums that
 * could be renames of removed enums (e.g. Layout global blocks → Pages blocks).
 * In Docker there's no TTY, so the push times out and the schema is never updated.
 *
 * This script adds the critical columns and enums directly via SQL so
 * drizzle-kit finds them already present and skips the interactive prompts.
 *
 * Safe to run on first deploy (uses IF NOT EXISTS / EXCEPTION blocks)
 * and safe to run repeatedly.
 */
import pg from 'pg'

async function migrate(): Promise<void> {
  const connectionString = process.env.DATABASE_URI
  if (!connectionString?.startsWith('postgres')) {
    console.log('[migrate-pages-posts] Not PostgreSQL, skipping')
    return
  }

  const pool = new pg.Pool({ connectionString })

  try {
    const dbResult = await pool.query('SELECT current_database(), current_schema()')
    const { current_database, current_schema } = dbResult.rows[0]
    console.log(
      `[migrate-pages-posts] Connected to database: ${current_database}, schema: ${current_schema}`,
    )

    // All statements are wrapped in DO $$ blocks to handle first-deploy gracefully
    const statements: string[] = []

    // 1. Add pages_id and posts_id columns to payload_locked_documents_rels
    //    This is the critical fix — without these columns, ALL admin pages break
    //    (not just Pages/Posts, but Layout, Theme, Store Settings too)
    for (const col of ['pages_id', 'posts_id']) {
      statements.push(
        `DO $$ BEGIN ALTER TABLE payload_locked_documents_rels ADD COLUMN IF NOT EXISTS "${col}" integer; EXCEPTION WHEN undefined_table THEN NULL; END $$;`,
      )
    }

    // 2. Add pages_id and posts_id to payload_preferences_rels (if exists)
    for (const col of ['pages_id', 'posts_id']) {
      statements.push(
        `DO $$ BEGIN ALTER TABLE payload_preferences_rels ADD COLUMN IF NOT EXISTS "${col}" integer; EXCEPTION WHEN undefined_table THEN NULL; END $$;`,
      )
    }

    // 3. Create the _status enum used by Pages/Posts draft system
    statements.push(
      `DO $$ BEGIN CREATE TYPE enum_pages_status AS ENUM ('draft', 'published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    )
    statements.push(
      `DO $$ BEGIN CREATE TYPE enum_posts_status AS ENUM ('draft', 'published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    )
    statements.push(
      `DO $$ BEGIN CREATE TYPE enum__pages_v_version_status AS ENUM ('draft', 'published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    )
    statements.push(
      `DO $$ BEGIN CREATE TYPE enum__posts_v_version_status AS ENUM ('draft', 'published'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    )

    // 4. Create block enum types for pages (these are what Drizzle confuses with Layout's old enums)
    const blockEnums: Record<string, string[]> = {
      // Hero block enums
      enum_pages_blocks_hero_variant: ['default', 'minimal', 'fullHeight'],
      enum_pages_blocks_hero_icon: ['book-open', 'library', 'sparkles', 'none'],
      enum_pages_blocks_hero_cta_buttons_variant: ['default', 'secondary', 'outline'],
      enum_pages_blocks_hero_alignment: ['left', 'center', 'right'],
      // Content block enums
      enum_pages_blocks_content_layout: ['oneColumn', 'twoColumns', 'threeColumns'],
      enum_pages_blocks_content_columns_align: ['left', 'center', 'right'],
      enum_pages_blocks_content_background_color: ['default', 'muted', 'primary'],
      // CallToAction enums
      enum_pages_blocks_call_to_action_icon: ['info', 'star', 'heart', 'alert', 'none'],
      enum_pages_blocks_call_to_action_background_color: [
        'default',
        'muted',
        'primary',
        'gradient',
      ],
      enum_pages_blocks_call_to_action_buttons_variant: ['default', 'secondary', 'outline'],
      enum_pages_blocks_call_to_action_buttons_size: ['default', 'sm', 'lg'],
      // Media block enums
      enum_pages_blocks_media_size: ['small', 'medium', 'large', 'full'],
      enum_pages_blocks_media_aspect_ratio: ['auto', 'square', 'video', 'wide'],
      // Archive block enums
      enum_pages_blocks_archive_collection: ['books', 'events'],
      enum_pages_blocks_archive_layout: ['grid', 'list'],
      // BookShowcase enums
      enum_pages_blocks_book_showcase_display_mode: ['newest', 'featured', 'category'],
      enum_pages_blocks_book_showcase_columns: ['2', '3', '4'],
      // FormBlock enums
      enum_pages_blocks_form_block_form_type: ['contact'],
    }

    // Create the same enums for posts, and versioned variants for both
    const allEnumStatements: string[] = []
    for (const [name, values] of Object.entries(blockEnums)) {
      const valuesList = values.map((v) => `'${v}'`).join(', ')

      // Pages enum
      allEnumStatements.push(
        `DO $$ BEGIN CREATE TYPE ${name} AS ENUM (${valuesList}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      )

      // Posts equivalent
      const postsName = name.replace('enum_pages_', 'enum_posts_')
      allEnumStatements.push(
        `DO $$ BEGIN CREATE TYPE ${postsName} AS ENUM (${valuesList}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      )

      // Versioned pages
      const pagesVName = name.replace('enum_pages_', 'enum__pages_v_version_')
      allEnumStatements.push(
        `DO $$ BEGIN CREATE TYPE ${pagesVName} AS ENUM (${valuesList}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      )

      // Versioned posts
      const postsVName = name.replace('enum_pages_', 'enum__posts_v_version_')
      allEnumStatements.push(
        `DO $$ BEGIN CREATE TYPE ${postsVName} AS ENUM (${valuesList}); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      )
    }

    statements.push(...allEnumStatements)

    // 5. Drop the old Layout blocks enums that no longer exist
    //    (we removed blocks from Layout global, so these are orphaned)
    const layoutBlockEnumPrefixes = [
      'enum_layout_blocks_',
      'enum__layout_v_blocks_',
    ]
    const layoutEnumSuffixes = [
      'hero_variant',
      'hero_icon',
      'hero_cta_buttons_variant',
      'hero_alignment',
      'content_layout',
      'content_columns_align',
      'content_background_color',
      'call_to_action_icon',
      'call_to_action_background_color',
      'call_to_action_buttons_variant',
      'call_to_action_buttons_size',
      'media_size',
      'media_aspect_ratio',
      'archive_collection',
      'archive_layout',
      'book_showcase_display_mode',
      'book_showcase_columns',
    ]

    for (const prefix of layoutBlockEnumPrefixes) {
      for (const suffix of layoutEnumSuffixes) {
        statements.push(`DROP TYPE IF EXISTS ${prefix}${suffix};`)
      }
    }

    console.log(`[migrate-pages-posts] Running ${statements.length} schema statements...`)
    for (const sql of statements) {
      await pool.query(sql)
    }

    console.log('[migrate-pages-posts] Column migration complete')
  } finally {
    await pool.end()
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[migrate-pages-posts] Migration failed:', error)
    process.exit(1)
  })
