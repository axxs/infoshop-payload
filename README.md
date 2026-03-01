# Infoshop Payload CMS

A complete management system for infoshops that serves as both a book inventory and sales platform, and a community organizing hub for events built with Payload CMS 3.x and Next.js 15.

## Features

- **Book Management**: Complete inventory with ISBN lookup (Open Library, Google Books, WorldCat), CSV bulk import, cover image downloads
- **Category & Subject Taxonomy**: Hierarchical categories + flat subject tags
- **Supplier Management**: Vendor tracking and contact details
- **Event Management**: Events, workshops, registration with capacity and waitlist
- **Square POS Integration**: Card payments, catalog sync, refunds
- **Customer Storefront**: Public e-commerce with cart, checkout, and anonymous payments
- **Customer Auth**: Self-registration, login/logout, account pages
- **Contact & Inquiries**: Contact form submissions, book inquiry system (when payments disabled)
- **Store Settings**: Toggle payments on/off, inquiry mode fallback
- **Theme System**: Admin-configurable themes with live preview, dark mode, block-based homepage
- **Sales Analytics**: Revenue tracking, daily reports, product analysis, CSV export
- **Rich Admin UI**: Payload's React Server Components admin panel

## Tech Stack

- **CMS**: Payload CMS 3.62.0
- **Framework**: Next.js 15.4.8 (App Router)
- **UI**: React 19.1.2 (Server Components)
- **Database**: PostgreSQL (production) / SQLite (development)
- **ORM**: Drizzle (via Payload)
- **Payments**: Square Web Payments SDK
- **Rich Text**: Lexical Editor
- **Testing**: Vitest (unit/integration) + Playwright (E2E)

## Quick Start

### Prerequisites

- Node.js ^18.20.2 || >=20.9.0
- npm

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
   DATABASE_URI=file:./infoshop.db

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
│   │   │   ├── admin/          # Admin UI
│   │   │   ├── api/            # REST + GraphQL API
│   │   │   └── api/square/     # Square payment/sync endpoints
│   │   └── (frontend)/         # Public storefront
│   │       ├── shop/           # Book browsing & detail pages
│   │       ├── events/         # Event listings & calendar
│   │       ├── cart/           # Shopping cart
│   │       ├── checkout/       # Checkout, success, inquiry-sent
│   │       ├── login/          # Login page
│   │       ├── register/       # Registration page
│   │       ├── account/        # Account, orders, events
│   │       └── contact/        # Contact form
│   ├── collections/            # Payload collection configs (12)
│   │   ├── Users.ts            # Auth with self-registration
│   │   ├── Media.ts            # File uploads
│   │   ├── Books.ts            # Book inventory
│   │   ├── Categories.ts       # Hierarchical categories
│   │   ├── Subjects.ts         # Subject tags
│   │   ├── Suppliers.ts        # Vendor management
│   │   ├── Events.ts           # Store events
│   │   ├── EventAttendance.ts  # Registration/attendance
│   │   ├── Sales.ts            # Sales transactions
│   │   ├── SaleItems.ts        # Sale line items
│   │   ├── ContactSubmissions.ts # Contact form entries
│   │   └── Inquiries.ts        # Book purchase inquiries
│   ├── globals/                # Payload globals (3)
│   │   ├── Theme.ts            # Theming configuration
│   │   ├── Layout.ts           # Header/footer/homepage
│   │   └── StoreSettings.ts    # Payment toggle & store config
│   ├── lib/                    # Shared libraries
│   │   ├── auth/               # Auth actions & utilities
│   │   ├── checkout/           # Cart & checkout logic
│   │   ├── contact/            # Contact form actions
│   │   ├── square/             # Square integration
│   │   ├── bookLookup/         # ISBN lookup (multi-source)
│   │   └── csv/                # CSV import processing
│   ├── payload.config.ts       # Main Payload configuration
│   └── payload-types.ts        # Auto-generated TypeScript types
├── .agent/                     # AI-assisted development docs
├── .claude/                    # Claude Code quality infrastructure
└── package.json
```

## Collections

### Books
Complete book inventory with ISBN/UPC identifiers, authors, publisher, pricing (cost/member/retail), stock management with low-stock alerts, category and subject relationships, supplier tracking, cover images.

### Categories
Hierarchical categorization (e.g., Fiction → Literary Fiction, Non-Fiction → History).

### Subjects
Flat subject tagging (Philosophy, Science Fiction, Cooking, etc.). Multiple subjects per book.

### Suppliers
Vendor management with contact details, ordering information, and notes.

### Events
Store events and workshops with dates, location, capacity, and status.

### EventAttendance
Event registration with capacity management, waitlist, and check-in tracking.

### Sales & SaleItems
Point of sale transactions with receipt numbers, payment methods, Square integration, and automatic stock deduction.

### ContactSubmissions
Public contact form entries with status tracking (new/read/replied).

### Inquiries
Book purchase inquiries submitted when online payments are disabled. Includes cart snapshot with book titles, quantities, and prices.

### Users & Media
Authentication with self-registration (role enforced to customer), file uploads with image processing.

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

## API Endpoints

### REST API

Base URL: `http://localhost:3000/api`

```bash
GET /api/books                                    # List all books
GET /api/books/:id                                # Get book by ID
GET /api/books?where[category][equals]=fiction     # Query with filters
POST /api/users                                   # Self-register
POST /api/contact-submissions                     # Submit contact form
POST /api/inquiries                               # Submit book inquiry
```

### GraphQL API

Playground: `http://localhost:3000/api/graphql-playground`

### Custom Endpoints

- `POST /api/books/lookup-isbn` — ISBN lookup via Open Library/Google Books/WorldCat
- `POST /api/books/csv-import/preview` — CSV import preview
- `POST /api/books/csv-import/execute` — CSV import execution
- `POST /api/square/payments` — Process card payment (public, rate-limited)
- `POST /api/square/sync` — Sync catalog to Square (admin)

See `.agent/system/api-endpoints.md` for complete documentation.

## Environment Variables

**Required**:

- `PAYLOAD_SECRET` — JWT signing key (generate with `openssl rand -base64 32`)
- `DATABASE_URI` — Database connection string

**Optional**:

- `NEXT_PUBLIC_SERVER_URL` — Server URL (default: `http://localhost:3000`)
- `SQUARE_ACCESS_TOKEN` — Square API access token
- `SQUARE_ENVIRONMENT` — `sandbox` or `production`
- `NEXT_PUBLIC_SQUARE_APPLICATION_ID` — Square Web Payments SDK app ID
- `NEXT_PUBLIC_SQUARE_LOCATION_ID` — Square location ID

See `.env.example` for complete documentation.

## Database

### Development (SQLite)

- File-based: `infoshop.db`
- No server required
- Automatically created on first run

### Production (PostgreSQL)

Update `.env.local`:

```env
DATABASE_URI=postgresql://user:password@localhost:5432/infoshop_payload
```

Payload auto-detects from the `DATABASE_URI` prefix and handles migrations automatically.

## Documentation

- **`.agent/`** — Token-optimised development documentation
  - `system/project-architecture.md` — Architecture overview
  - `system/database-schema.md` — 12 collections + 3 globals
  - `system/api-endpoints.md` — REST/GraphQL/custom endpoints
  - `system/key-components.md` — Implementation patterns
- **`src/lib/square/README.md`** — Square integration guide
- **`CLAUDE.md`** — Claude Code development guidelines

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use PostgreSQL database
- [ ] Configure cloud storage (S3/GCS/Azure)
- [ ] Set up email provider
- [ ] Generate secure `PAYLOAD_SECRET`
- [ ] Configure proper `NEXT_PUBLIC_SERVER_URL`
- [ ] Configure Square production credentials
- [ ] Run `npm run build`
- [ ] Run `npm run start`

### Deployment Targets

- **Coolify** — Self-hosted PaaS (current production)
- **Vercel** — Native Next.js support
- **Payload Cloud** — Managed Payload hosting

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
rm infoshop.db-shm infoshop.db-wal
npm run dev
```

**Build errors**

```bash
npm run devsafe  # Clean start
```

## Resources

- **Payload Docs**: https://payloadcms.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **GitHub Issues**: https://github.com/axxs/infoshop-payload/issues

## License

Proprietary - Infoshop Bookshop
