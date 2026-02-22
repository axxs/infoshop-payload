# Project Architecture

## Overview

Infoshop Payload is a Next.js 15 application with Payload CMS 3.62.0 for content management and e-commerce functionality.

## Tech Stack

- **Framework**: Next.js 15.4.4 (App Router)
- **CMS**: Payload CMS 3.62.0
- **UI**: React 19.1.0 (Server Components + Client Components)
- **Database**: SQLite (development) → PostgreSQL (production planned)
- **ORM**: Drizzle (via Payload)
- **Rich Text**: Lexical editor
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Package Manager**: npm (development) / pnpm (Payload monorepo compatibility)

## Directory Structure

```
/home/axxs/infoshop-payload/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (payload)/          # Payload admin routes
│   │   │   ├── admin/[[...segments]]/  # Admin UI
│   │   │   ├── api/[...slug]/          # Payload REST API
│   │   │   └── api/graphql/            # GraphQL API
│   │   └── (frontend)/         # Public storefront (future)
│   │       ├── layout.tsx
│   │       └── page.tsx
│   ├── collections/            # Payload collection configs
│   │   ├── Users.ts
│   │   ├── Media.ts
│   │   ├── Books.ts
│   │   ├── Categories.ts
│   │   ├── Subjects.ts
│   │   ├── Suppliers.ts
│   │   └── Events.ts
│   ├── payload.config.ts       # Main Payload configuration
│   └── payload-types.ts        # Auto-generated TypeScript types
├── tests/
│   ├── int/                    # Integration tests
│   └── e2e/                    # End-to-end tests
├── .claude/                    # Claude Code quality infrastructure
├── .agent/                     # Token-optimised documentation
└── package.json
```

## Architecture Patterns

### Payload CMS Integration

- **Server-first**: Payload runs as Next.js middleware
- **Collections as API**: Each collection auto-generates REST + GraphQL endpoints
- **Admin UI**: React Server Components for admin panel
- **Access Control**: Role-based permissions defined in collections

### Next.js App Router Structure

**Payload Routes** (`/app/(payload)/`):

- Handled by Payload CMS
- Admin UI at `/admin`
- REST API at `/api`
- GraphQL at `/api/graphql`

**Public Routes** (`/app/(frontend)/`):

- Customer-facing storefront with theming
- Shop pages (`/shop`, `/shop/[slug]`)
- Events pages (`/events`, `/events/[slug]`)
- Cart and checkout (`/cart`, `/checkout`)
- Account pages (`/account/orders`, `/account/events`)

### Data Flow

```
User Request
    ↓
Next.js App Router
    ↓
Payload Middleware
    ↓
Collection Config (validation, hooks, access control)
    ↓
Drizzle ORM
    ↓
SQLite/PostgreSQL Database
```

## Key Concepts

### Collections

Collections are data models with:

- **Fields**: Data schema definition
- **Hooks**: Lifecycle events (beforeChange, afterRead, etc.)
- **Access Control**: Who can read/write
- **Admin UI**: Auto-generated or customisable

### Hooks

Payload hooks allow custom logic at lifecycle events:

- `beforeOperation`: Before CRUD operations
- `beforeChange`: Before data is saved
- `afterChange`: After data is saved
- `beforeRead`: Before data is returned
- `afterRead`: After data is fetched

### Access Control

Function-based access control:

```typescript
access: {
  create: ({ req: { user } }) => !!user,
  read: () => true,
  update: ({ req: { user } }) => user?.role === 'admin',
  delete: ({ req: { user } }) => user?.role === 'admin',
}
```

## Development Workflow

1. **Modify Collection** → Edit `src/collections/*.ts`
2. **Types Regenerate** → Run `npm run generate:types`
3. **Test Changes** → `npm test`
4. **Dev Server** → `npm run dev` (http://localhost:3001)

## Testing Strategy

- **Unit Tests**: Collection configs, utilities
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: Admin UI workflows, user flows

## Migration Context

Migrating from:

- **Old**: Express + Prisma + React (separate backend/frontend)
- **New**: Payload CMS + Next.js (unified stack)

### Migration Phases

1. ✅ **Phase 1**: Foundation setup
2. ✅ **Phase 2**: Data migration (N/A - clean slate)
3. ✅ **Phase 3**: Core features (Square sync, ISBN lookup, CSV import)
4. ✅ **Phase 4**: Sales system (cart, checkout, orders)
5. ✅ **Phase 5**: Events system (registration, calendar, capacity)
6. ✅ **Phase 6**: Theme system (CSS vars, blocks, dark mode)
7. 📅 **Phase 7**: Public Storefront/CMS (pages, navigation, SEO)
8. 📅 **Phase 8**: Advanced features (as needed)

## Key Systems

### Theme System

- Payload Globals for theme configuration (colors, fonts)
- CSS variables with Tailwind v4
- Block-based content composition (Hero, BookShowcase, Content, CTA, Media, Archive)
- Dark mode support (auto/light/dark)

### Sales System

- Server-side cart (encrypted cookies)
- Square Web Payments SDK integration
- Order management with status tracking

### Events System

- Event registration with capacity management
- Waitlist support
- Check-in functionality

## References

- Payload Docs: https://payloadcms.com/docs
- Next.js App Router: https://nextjs.org/docs/app
- Migration Roadmap: `MIGRATION_ROADMAP.md`

---

Last Updated: 2026-02-01
