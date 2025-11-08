# Week 5: Theme Configuration & Seed Script

**Status**: ✅ Complete
**Date**: 2025-01-08

## Summary

Week 5 focused on creating an automated seed script to populate the Theme and Layout globals with production-ready configurations, eliminating the need for manual data entry via the admin panel.

## Deliverables

### 1. Seed Script (`src/scripts/seed-theme.ts`)

**Purpose**: Programmatically populate Theme and Layout globals with complete configurations

**Features**:

- Loads environment variables via dotenv
- Seeds Theme Global with both themes (default and radical)
- Seeds Layout Global with header, footer, and 6 homepage blocks
- Provides helpful next steps after completion
- Error handling with meaningful messages

**Usage**:

```bash
pnpm seed:theme
```

**What It Seeds**:

1. **Theme Global**:
   - Active theme: default
   - Colour mode: auto
   - Default theme (22 colour tokens + 3 typography settings)
   - Radical theme (22 colour tokens + 3 typography settings)

2. **Layout Global**:
   - Header navigation (4 top-level links with nested children)
   - Header CTA button
   - Footer (3 columns with links)
   - Social links (Facebook, Twitter, Instagram)
   - Copyright text
   - 6 Homepage blocks:
     1. Hero Section (full height, centre aligned, 2 CTA buttons)
     2. Book Showcase (newest books, 8 items, 4 columns)
     3. Content Block (two columns, About & Mission)
     4. Book Showcase (featured books, 8 items, 4 columns)
     5. Call to Action (membership, gradient background)
     6. Archive Block (upcoming events, grid layout)

### 2. NPM Script Addition

Added `seed:theme` script to `package.json`:

```json
"seed:theme": "cross-env NODE_OPTIONS='--no-deprecation --require dotenv/config' tsx src/scripts/seed-theme.ts"
```

**Why This Works**:

- `NODE_OPTIONS='--require dotenv/config'` ensures environment variables are loaded before the Payload config is imported
- This solves the "missing secret key" error that occurs when env vars aren't available at config evaluation time

## Technical Challenges Solved

### Challenge 1: Environment Variable Loading

**Problem**: The Payload config (`payload.config.ts`) uses `process.env.PAYLOAD_SECRET` at import time. Standard dotenv loading in the script wasn't early enough.

**Solution**: Use `NODE_OPTIONS='--require dotenv/config'` to load environment variables before any module imports.

**Learning**: When working with configs that use env vars at module evaluation time, env vars must be loaded before the Node.js runtime begins importing modules.

### Challenge 2: Field Name Mismatches

**Problem**: TypeScript errors due to incorrect field names:

- `default_light_cardForeground` should be `default_light_card_foreground` (underscore not camelCase)
- `default_light_popover` and related fields don't exist in Theme Global (only 11 colour tokens per mode, not 18)

**Solution**: Verified actual field names in `Theme.ts` and used only the fields that exist:

- primary, background, foreground
- card, card_foreground
- muted, muted_foreground
- accent, accent_foreground
- destructive
- border

### Challenge 3: Layout Global Structure

**Problem**: Initial attempt used nested structure with `header` and `footer` objects, but Payload tabs are just for admin UI organization - the data is flat.

**Solution**: Removed nesting and put all fields at the top level:

```typescript
{
  // Header fields (flat)
  navigation: [...],
  ctaButton: {...},
  // Footer fields (flat)
  columns: [...],
  socialLinks: [...],
  copyright: "...",
  // Homepage fields (flat)
  blocks: [...]
}
```

### Challenge 4: Field Types (Text vs RichText)

**Problem**: BookShowcase `title` field is type `text`, not `richText`, but seed script used Lexical JSON structure.

**Solution**:

- Text fields: Simple string values
- RichText fields: Lexical JSON structure with `{ root: { type: 'root', children: [...] } }`

**Field Type Reference**:

- Hero `title` and `subtitle`: richText (Lexical JSON)
- BookShowcase `title`: text (string)
- BookShowcase `description`: richText (Lexical JSON)
- Content `columns[].richText`: richText (Lexical JSON)
- CallToAction `title`: text (string)
- CallToAction `description`: richText (Lexical JSON)

### Challenge 5: Enum Values

**Problem**: Used incorrect enum values:

- Hero `icon`: Used `"BookOpen"` instead of `"book-open"`
- CallToAction `icon`: Used `"Users"` instead of valid option (used `"info"`)
- CallToAction `backgroundColor`: Used `"primary"` instead of valid options (used `"gradient"`)
- Hero button `variant`: Used `"secondary"` instead of valid options (only `"default"` and `"outline"` available)

**Solution**: Checked block definitions for exact enum values and used only valid options.

## Testing

### Seed Script Execution

✅ **First Run**: Successfully seeded Theme and Layout globals
✅ **Second Run**: Successfully re-seeded (updates existing data)
✅ **NPM Script**: `pnpm seed:theme` works correctly

### Output Verification

```
🌱 Starting theme seed...
✓ Environment variables loaded
[✓] Pulling schema from database...
📝 Seeding Theme Global...
✅ Theme Global seeded successfully
📝 Seeding Layout Global...
✅ Layout Global seeded successfully

🎉 Theme seed completed successfully!
```

## Files Created/Modified

### Created

1. `src/scripts/seed-theme.ts` (447 lines)

### Modified

1. `package.json` (added `seed:theme` script)

## Benefits

### For Developers

- **Instant Setup**: New developers can populate theme configuration with one command
- **Consistent Config**: Everyone gets the same baseline configuration
- **No Manual Entry**: Eliminates tedious manual data entry in admin panel
- **Repeatable**: Can be run multiple times safely (updates existing data)

### For Production

- **CI/CD Integration**: Can be run as part of deployment pipeline
- **Environment Promotion**: Easy to sync configuration across environments
- **Disaster Recovery**: Quick restoration of theme configuration

### For Testing

- **Test Data**: Provides realistic test data for homepage rendering
- **Integration Tests**: Can be used to seed data before running E2E tests

## Next Steps

Week 5 is complete. The system now has:

- ✅ Theme system architecture (Week 1-4)
- ✅ Complete documentation
- ✅ Automated seed script

**Remaining Work**:

- Week 6: Header/footer component migration to use Layout Global
- Week 7: Live preview, integration tests, final polish

## Known Issues

None. All TypeScript and linting checks pass.

---

**Week 5 Completion**: 2025-01-08
**Implementation Time**: ~2 hours (including debugging env var loading)
**Lines of Code**: 447 (seed script)
