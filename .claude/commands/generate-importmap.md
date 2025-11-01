# Generate Payload Import Map

Generate the import map required for Payload's React Server Components. This maps component paths to their actual locations.

## When to Use

- After adding custom components to Admin UI
- After creating new collections with custom fields
- When you see "PayloadComponent not found in importMap" warnings
- After adding custom views or edit components

## What It Does

Scans the codebase for Payload components and creates a mapping file that tells Payload where to find them at runtime. Required for React Server Components to work correctly.

## Command

```bash
npm run generate:importmap
```

## Expected Output

```
✓ Import map generated successfully
  └─ Generated mappings for X components
```

## Warning Messages

If you see this warning in the console:

```
⚠ getFromImportMap: PayloadComponent not found in importMap
   You may need to run the `payload generate:importmap` command
```

Run this command to fix it.

## Next Steps

After generating import map:

1. Restart your dev server (`npm run dev`)
2. Verify custom components load correctly in Admin UI
3. Check that the warning no longer appears

## Automatic Generation

Import map is automatically generated during:

- `npm run dev` (first start)
- `npm run build` (production builds)

Manual generation is only needed when:

- Adding components while dev server is running
- Troubleshooting component loading issues

## Troubleshooting

**Warning persists after generation**

- Restart dev server completely
- Delete `.next` folder and restart: `npm run devsafe`

**Components not found**

- Ensure component exports are correct
- Check component file paths match Payload conventions

## Related Commands

- `/generate-types` - Generate TypeScript types (run this first)
- `/payload-dev` - Start dev server with clean build
