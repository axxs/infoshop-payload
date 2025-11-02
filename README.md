# 🏴 Infoshop Payload CMS

A complete management system for infoshops that serves as both a book inventory and sales platform, and a community organizing hub for events and collective decision-making built with Payload CMS 3.x and Next.js 15.

*This is a complete, in progress, rewrite of the Infoshop system using modern headless CMS architecture.*

## Features

- **Book Management**: Complete inventory system with ISBN lookup, bulk operations
- **Category & Subject Taxonomy**: Categories + flat subject tags
- **Supplier Management**: Vendor tracking and purchasing workflow
- **Event Management**: Store events, workshops, and author appearances
- **Square POS Integration**: (Phase 3) Real-time inventory sync
- **Customer Storefront**: (Phase 4) Public-facing e-commerce
- **Rich Admin UI**: Payload's React Server Components admin panel

## Tech Stack

- **CMS**: Payload CMS 3.62.0
- **Framework**: Next.js 15.4.4 (App Router)
- **UI**: React 19.1.0 (Server Components)
- **Database**: SQLite (development) → PostgreSQL (production)
- **ORM**: Drizzle (via Payload)
- **Rich Text**: Lexical Editor
- **Testing**: Vitest (unit/integration) + Playwright (E2E)

## Quick Start

### Prerequisites

- Node.js ^18.20.2 || >=20.9.0
- npm (or pnpm ^9.7.0)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/axxs/infoshop-payload.git
   cd infoshop-payload
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and update:

   ```env
   # Generate with: openssl rand -base64 32
   PAYLOAD_SECRET=your-secret-key-here

   # SQLite for development
   DATABASE_URI=file:./infoshop-blank.db

   # Your local server URL
   NEXT_PUBLIC_SERVER_URL=http://localhost:3000
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

5. **Open the admin panel**

   Navigate to <http://localhost:3000/admin> and create your first admin user.

## Project Structure

```
infoshop-payload/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (payload)/          # Payload admin + API routes
│   │   │   ├── admin/[[...segments]]/  # Admin UI
│   │   │   ├── api/[...slug]/          # REST API
│   │   │   └── api/graphql/            # GraphQL API
│   │   └── (frontend)/         # Public storefront (Phase 4)
│   ├── collections/            # Payload collection configs
│   │   ├── Users.ts            # Authentication
│   │   ├── Media.ts            # File uploads
│   │   ├── Books.ts            # Book inventory
│   │   ├── Categories.ts       # Hierarchical categories
│   │   ├── Subjects.ts         # Subject tags
│   │   ├── Suppliers.ts        # Vendor management
│   │   └── Events.ts           # Store events
│   ├── payload.config.ts       # Main Payload configuration
│   └── payload-types.ts        # Auto-generated TypeScript types
├── .agent/                     # AI-assisted development docs
├── .claude/                    # Claude Code quality infrastructure
├── tests/                      # Test suites
└── MIGRATION_PLAN.md          # Migration strategy documentation
```

## Collections

### Books

Complete book inventory with:

- ISBN/UPC identifiers
- Authors, publisher, publication details
- Pricing (cost, member, retail)
- Stock management with low-stock alerts
- Category (single) and Subjects (multiple) relationships
- Supplier tracking
- Cover images

### Categories

Hierarchical categorization:

- Fiction → Literary Fiction
- Non-Fiction → History → Australian History
- Children's → Picture Books

### Subjects

Flat subject tagging:

- Philosophy, Science Fiction, Cooking, etc.
- Multiple subjects per book

### Suppliers

Vendor management:

- Contact details
- Ordering information
- Notes and terms

### Events

Store events and workshops:

- Event details and descriptions
- Start/end dates
- Location and capacity
- Event images

### Users & Media

- Authentication and authorization
- File uploads with image processing

## Development

### Available Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run devsafe          # Clean start (deletes .next cache)

# Building
npm run build            # Production build
npm run start            # Start production server

# Code Quality
npm run format           # Format code with Prettier
npm run lint             # Lint with Next.js ESLint
npm test                 # Run all tests

# Payload-Specific
npm run generate:types       # Generate TypeScript types
npm run generate:importmap   # Generate import map
npm run payload              # Payload CLI
```

### Claude Code Slash Commands

If using Claude Code, these commands are available:

- `/generate-types` - Generate TypeScript types from collections
- `/generate-importmap` - Fix component loading issues
- `/payload-dev` - Start dev server with troubleshooting tips

### Workflow

1. **Modify Collections**: Edit `src/collections/*.ts`
2. **Regenerate Types**: `npm run generate:types`
3. **Test Changes**: `npm test`
4. **Start Server**: `npm run dev`

### Adding New Collections

1. Create `src/collections/YourCollection.ts`
2. Export collection config
3. Add to `src/payload.config.ts` collections array
4. Run `npm run generate:types`
5. Restart dev server

See `.agent/system/key-components.md` for detailed patterns.

## API Endpoints

### REST API

Base URL: `http://localhost:3000/api`

```bash
# List all books
GET /api/books

# Get book by ID
GET /api/books/:id

# Create book (requires auth)
POST /api/books

# Query with filters
GET /api/books?where[category][equals]=fiction&limit=10

# Populate relationships
GET /api/books/:id?depth=1
```

### GraphQL API

Playground: `http://localhost:3000/api/graphql-playground`

```graphql
query {
  Books(limit: 10) {
    docs {
      title
      isbn
      category {
        name
      }
      subjects {
        name
      }
    }
  }
}
```

See `.agent/system/api-endpoints.md` for complete API documentation.

## Testing

```bash
# Run all tests
npm test

# Integration tests (Vitest)
npm run test:int

# E2E tests (Playwright)
npm run test:e2e
npm run test:e2e:headed  # With browser UI
```

## Database

### Development (SQLite)

- File-based: `infoshop-blank.db`
- No server required
- Automatically created on first run

### Production (PostgreSQL)

Update `.env.local`:

```env
DATABASE_URI=postgresql://user:password@localhost:5432/infoshop_payload
```

Payload handles migrations automatically.

## Migration Context

This project is migrating from:

- **Old**: Express + Prisma + React (separate backend/frontend)
- **New**: Payload CMS + Next.js (unified stack)

See `MIGRATION_PLAN.md` for full migration strategy and phases.

## Documentation

- **`.agent/`**: Token-optimised development documentation
  - `system/project-architecture.md` - Architecture overview
  - `system/database-schema.md` - Collection schemas
  - `system/api-endpoints.md` - API documentation
  - `system/key-components.md` - Implementation patterns
- **`MIGRATION_PLAN.md`**: Migration strategy and phases
- **`CLAUDE.md`**: Claude Code development guidelines

## Environment Variables

Required:

- `PAYLOAD_SECRET` - JWT signing key (generate with `openssl rand -base64 32`)
- `DATABASE_URI` - Database connection string
- `NEXT_PUBLIC_SERVER_URL` - Server URL (e.g., `http://localhost:3000`)

Optional (future):

- Email configuration (SMTP)
- S3/Cloud storage
- Square POS credentials

See `.env.example` for complete documentation.

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use PostgreSQL database
- [ ] Configure cloud storage (S3/GCS/Azure)
- [ ] Set up email provider
- [ ] Generate secure `PAYLOAD_SECRET`
- [ ] Configure proper `NEXT_PUBLIC_SERVER_URL`
- [ ] Run `npm run build`
- [ ] Run `npm run start`

### Deployment Targets

- **Vercel**: Native Next.js support
- **Payload Cloud**: Managed Payload hosting
- **Self-hosted**: Docker, VPS, or dedicated server

See Payload Cloud docs: https://payloadcms.com/docs/cloud

## Troubleshooting

### Common Issues

**"PayloadComponent not found in importMap"**

```bash
npm run generate:importmap
npm run dev
```

**Database locked**

```bash
# Close any database clients, then:
rm infoshop-blank.db-shm infoshop-blank.db-wal
npm run dev
```

**Build errors**

```bash
npm run devsafe  # Clean start
```

**Module not found**

```bash
npm install
```

## Resources

- **Payload Docs**: https://payloadcms.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Payload Discord**: https://discord.com/invite/payload
- **GitHub Issues**: https://github.com/axxs/infoshop-payload/issues

## License

Proprietary - Infoshop Bookshop

## Support

For questions or issues:

- Check `.agent/` documentation first
- Review `MIGRATION_PLAN.md` for context
- Open a GitHub issue
- Contact the development team

---

**Current Migration Status**: Phase 1 (Foundation Setup) ✅

See `MIGRATION_PLAN.md` for next steps.
