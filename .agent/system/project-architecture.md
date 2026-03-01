# Project Architecture

## Overview

Infoshop Payload is a Next.js 15 application with Payload CMS for content management, e-commerce, and community organizing.

## Tech Stack

- **Framework**: Next.js 15.4.8 (App Router)
- **CMS**: Payload CMS 3.62.0
- **UI**: React 19.1.2 (Server Components + Client Components)
- **Database**: PostgreSQL (production) / SQLite (local development)
- **ORM**: Drizzle (via Payload)
- **Rich Text**: Lexical editor
- **Payments**: Square Web Payments SDK
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Package Manager**: npm

## Directory Structure

```
/home/axxs/infoshop-payload/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (payload)/              # Payload admin routes
│   │   │   ├── admin/[[...segments]]/  # Admin UI
│   │   │   ├── api/[...slug]/          # Payload REST API
│   │   │   ├── api/graphql/            # GraphQL API
│   │   │   └── api/square/             # Custom Square endpoints
│   │   │       ├── payments/route.ts   # Card payments (public)
│   │   │       └── sync/route.ts       # Catalog sync (admin)
│   │   └── (frontend)/             # Public storefront
│   │       ├── layout.tsx
│   │       ├── page.tsx             # Homepage
│   │       ├── shop/                # Book browsing
│   │       │   ├── page.tsx
│   │       │   ├── [slug]/page.tsx
│   │       │   ├── categories/
│   │       │   └── subjects/
│   │       ├── events/              # Event pages
│   │       │   ├── page.tsx
│   │       │   ├── [id]/page.tsx
│   │       │   └── calendar/page.tsx
│   │       ├── cart/page.tsx        # Shopping cart
│   │       ├── checkout/            # Checkout flow
│   │       │   ├── page.tsx
│   │       │   ├── success/page.tsx
│   │       │   └── inquiry-sent/page.tsx
│   │       ├── contact/page.tsx     # Contact form
│   │       ├── login/               # Auth pages
│   │       │   ├── page.tsx
│   │       │   └── LoginForm.tsx
│   │       ├── register/
│   │       │   ├── page.tsx
│   │       │   └── RegisterForm.tsx
│   │       ├── account/             # User account
│   │       │   ├── page.tsx
│   │       │   ├── LogoutButton.tsx
│   │       │   ├── orders/
│   │       │   └── events/
│   │       └── components/layout/   # Shared layout components
│   │           ├── Header.tsx
│   │           ├── HeaderDynamic.tsx
│   │           └── Footer.tsx
│   ├── collections/                 # Payload collection configs (12)
│   │   ├── Users.ts
│   │   ├── Media.ts
│   │   ├── Books.ts (+ Books/ dir for hooks, components)
│   │   ├── Categories.ts
│   │   ├── Subjects.ts
│   │   ├── Suppliers.ts
│   │   ├── Events.ts
│   │   ├── EventAttendance.ts
│   │   ├── Sales.ts
│   │   ├── SaleItems.ts
│   │   ├── ContactSubmissions.ts
│   │   └── Inquiries.ts
│   ├── globals/                     # Payload globals (3)
│   │   ├── Theme.ts
│   │   ├── Layout.ts
│   │   └── StoreSettings.ts
│   ├── lib/                         # Shared libraries
│   │   ├── auth/                    # Auth actions & utilities
│   │   ├── checkout/                # Cart & checkout logic
│   │   ├── contact/                 # Contact form actions
│   │   ├── square/                  # Square integration
│   │   ├── bookLookup/             # ISBN lookup (multi-source)
│   │   ├── csv/                     # CSV import processing
│   │   ├── access.ts               # Access control utilities
│   │   └── rateLimit.ts            # IP-based rate limiting
│   ├── payload.config.ts           # Main Payload configuration
│   └── payload-types.ts            # Auto-generated TypeScript types
├── .agent/                          # Token-optimised documentation
├── .claude/                         # Claude Code quality infrastructure
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
- Custom routes at `/api/square/*`

**Public Routes** (`/app/(frontend)/`):

- Customer-facing storefront with theming
- Shop pages (`/shop`, `/shop/[slug]`, `/shop/categories/`, `/shop/subjects/`)
- Events pages (`/events`, `/events/[id]`, `/events/calendar`)
- Cart and checkout (`/cart`, `/checkout`, `/checkout/success`, `/checkout/inquiry-sent`)
- Auth pages (`/login`, `/register`)
- Account pages (`/account`, `/account/orders`, `/account/events`)
- Contact page (`/contact`)

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
PostgreSQL / SQLite Database
```

### Auth Flow

```
Frontend Form → Server Action (actions.ts) → payload.create/login → JWT cookie set
                                                                     ↓
Server Component → getCurrentUser() → payload.auth({ headers }) → User | null
```

## Key Systems

### Theme System

- Payload Globals for theme configuration (colors, fonts)
- CSS variables with Tailwind v4
- Block-based content composition (Hero, BookShowcase, Content, CTA, Media, Archive)
- Dark mode support (auto/light/dark)

### Sales System

- Server-side cart (encrypted cookies)
- Square Web Payments SDK integration
- Anonymous checkout (no auth required for payment)
- Order management with status tracking

### Events System

- Event registration with capacity management
- Waitlist support
- Check-in functionality

### Auth System

- Public self-registration (role enforced to customer)
- JWT-based auth with cookie storage
- Rate-limited registration (5/IP/15min)
- Open redirect protection on login/register redirects

### Store Settings

- Toggle card payments on/off via admin
- When payments disabled, checkout switches to inquiry submission
- Cache invalidation via Next.js `revalidateTag`

## Development Workflow

1. **Modify Collection** → Edit `src/collections/*.ts`
2. **Types Regenerate** → Run `npm run generate:types`
3. **Test Changes** → `npm test`
4. **Dev Server** → `npm run dev` (http://localhost:3000)

## Migration Phases

1. **Phase 1**: Foundation setup
2. **Phase 2**: Data migration (N/A - clean slate)
3. **Phase 3**: Core features (Square sync, ISBN lookup, CSV import)
4. **Phase 4**: Sales system (POS, cart, checkout, analytics, storefront)
5. **Phase 5**: Events system (registration, calendar, capacity)
6. **Phase 6**: Theme system (CSS vars, blocks, dark mode)
7. **Phase 7**: Store settings, contact form, inquiry system, customer auth
8. **Phase 8**: Production deployment (pending)

## References

- Payload Docs: https://payloadcms.com/docs
- Next.js App Router: https://nextjs.org/docs/app

---

Last Updated: 2026-03-01
