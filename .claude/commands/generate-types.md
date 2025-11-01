# Generate Payload TypeScript Types

Generate TypeScript types from Payload collection configs. This must be run after modifying any collection configurations.

## When to Use

- After creating a new collection
- After modifying fields in an existing collection
- After changing relationships or field types
- When `payload-types.ts` is out of sync with collection configs

## What It Does

Reads all collection configurations in `src/collections/` and generates TypeScript interfaces in `src/payload-types.ts`.

## Command

```bash
npm run generate:types
```

## Expected Output

```
✓ Payload types generated successfully
  └─ src/payload-types.ts
```

## Next Steps

After generating types:

1. Verify `src/payload-types.ts` contains your new/updated interfaces
2. Import and use types in your code:
   ```typescript
   import type { Book, Category } from './payload-types'
   ```
3. Run `npm run dev` to ensure no TypeScript errors

## Troubleshooting

**Error: "Cannot find collection"**

- Check collection is exported in `src/payload.config.ts`
- Ensure collection slug matches the filename

**Types not updating**

- Delete `src/payload-types.ts` and regenerate
- Check for TypeScript errors in collection configs

## Related Commands

- `/generate-importmap` - Generate import map after type generation
- `/payload-dev` - Start dev server (auto-generates types if missing)
