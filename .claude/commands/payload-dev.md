# Start Payload Development Server

Start the Payload CMS development server with Next.js.

## Quick Start

```bash
npm run dev
```

## Server Details

- **URL**: <http://localhost:3000>
- **Admin Panel**: <http://localhost:3000/admin>
- **API**: <http://localhost:3000/api>
- **GraphQL Playground**: <http://localhost:3000/api/graphql-playground>

## Auto-Generated Files

The dev server automatically:

- Generates TypeScript types (`src/payload-types.ts`)
- Generates import map for React Server Components
- Creates database schema if it doesn't exist
- Applies any pending database migrations

## Clean Start (Troubleshooting)

If you encounter build issues or stale cache:

```bash
npm run devsafe
```

This removes `.next` build cache before starting.

## Development Workflow

1. **Start server**: `npm run dev`
2. **Make changes**: Edit collection configs, components, etc.
3. **Hot reload**: Next.js automatically reloads on file changes
4. **Admin UI**: Navigate to `/admin` to see changes

## First Time Setup

On first run, you'll need to:

1. Create an initial admin user through the UI
2. Configure environment variables (see `.env.local`)

## Environment Variables Required

```env
PAYLOAD_SECRET=your-secret-key
DATABASE_URI=file:./infoshop.db
NEXT_PUBLIC_SERVER_URL=http://localhost:3000
```

## Console Output

Expected startup output:

```
▲ Next.js 15.4.4
- Local:   http://localhost:3000

✓ Ready in 2.3s
✓ Pulling schema from database...
✓ Compiled /admin/[[...segments]] in X.Xs
```

## Common Warnings

**"No email adapter provided"**

- Normal in development
- Emails logged to console instead of being sent

**"Multiple lockfiles found"**

- Safe to ignore if using npm
- Payload monorepo warning

**"PayloadComponent not found"**

- Run `/generate-importmap` command
- Restart dev server

## Stopping the Server

Press `Ctrl+C` in the terminal to stop the server.

## Next Steps

After server starts:

1. Open <http://localhost:3000/admin>
2. Create test data through Admin UI
3. Test API endpoints at `/api/books`, `/api/categories`, etc.
4. Check GraphQL Playground at `/api/graphql-playground`

## Troubleshooting

**Port 3000 in use**

- Stop other services using port 3000
- Or change port: `PORT=3001 npm run dev`

**Database locked**

- Close any database clients
- Delete `infoshop.db-shm` and `infoshop.db-wal`

**Build errors**

- Run `npm run devsafe` for clean start
- Check TypeScript errors: `npm run lint`
- Regenerate types: `/generate-types`

**Module not found**

- Run `npm install` to ensure all dependencies installed
- Check `node_modules/.bin/` has correct permissions

## Related Commands

- `/generate-types` - Regenerate TypeScript types
- `/generate-importmap` - Fix component loading issues
