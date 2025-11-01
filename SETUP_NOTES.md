# Payload CMS Setup Notes

## Issue Resolution

### Problem

Manual Payload configuration resulted in a CodeEditor runtime error:

```
TypeError: Cannot destructure property 'config' of 'ue(...)' as it is undefined.
```

### Root Cause

The manual configuration was missing critical dependencies:

1. **`@payloadcms/ui`** - Contains admin UI components including CodeEditor
2. **`@payloadcms/payload-cloud`** - Cloud integration plugin
3. **`admin.importMap`** - Required config for module resolution

### Solution

Used the official CLI-generated blank template as the base:

```bash
npx create-payload-app infoshop-blank --template blank --db sqlite
```

Then migrated custom collections:

- Books.ts
- Categories.ts
- Subjects.ts
- Suppliers.ts
- Events.ts

### Key Dependencies (package.json)

```json
{
  "@payloadcms/next": "3.62.0",
  "@payloadcms/payload-cloud": "3.62.0",
  "@payloadcms/richtext-lexical": "3.62.0",
  "@payloadcms/ui": "3.62.0",
  "@payloadcms/db-sqlite": "3.62.0",
  "payload": "3.62.0",
  "next": "15.4.4",
  "react": "19.1.0",
  "react-dom": "19.1.0"
}
```

### Critical Config (payload.config.ts)

```typescript
export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '- Infoshop',
    },
  },
  collections: [Users, Media, Books, Categories, Subjects, Suppliers, Events],
  plugins: [payloadCloudPlugin()],
  // ... rest of config
})
```

## Current Status

✅ Admin panel accessible at http://localhost:3001/admin
✅ All 7 collections configured: Users, Media, Books, Categories, Subjects, Suppliers, Events
✅ SQLite database configured
✅ Authentication ready
✅ Import map generated (no warnings)
✅ No runtime errors
✅ Production-ready setup

## Next Steps for POC Evaluation

1. **Create first user** via admin interface
2. **Test CRUD operations** on Books collection
3. **Evaluate admin UX** for bookshop staff
4. **Test relationships** (Books → Categories, Subjects, Suppliers)
5. **Assess data validation** and field types
6. **Review auto-generated API** endpoints
7. **Compare to custom implementation** (feature parity, ease of use)

## Lessons Learned

1. **Always use official CLI** for initial setup
   - `npx create-payload-app` ensures correct dependencies
   - Manual configuration prone to missing critical packages

2. **Payload requires specific packages**
   - `@payloadcms/ui` is NOT optional - admin panel depends on it
   - `@payloadcms/payload-cloud` provides core cloud features
   - `admin.importMap` required for proper module resolution

3. **Version alignment matters**
   - All `@payloadcms/*` packages must match Payload version exactly
   - Next.js 15.4.4 and React 19.1.0 confirmed working

4. **Template selection**
   - Blank template provides minimal setup
   - Website template includes more features but more complex
   - Both work correctly when generated via CLI
