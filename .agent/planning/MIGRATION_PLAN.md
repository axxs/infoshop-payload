# Infoshop Migration Plan: Custom Codebase → Payload CMS

## Executive Summary

**Goal:** Migrate from custom Express + React architecture to Payload CMS as the primary development workspace.

**Timeline:** Phased approach over 4-6 weeks
**Risk Level:** Medium (careful data migration required)
**Confidence:** High (POC validated all critical features)

---

## Current State Analysis

### Existing Custom Codebase (`/home/axxs/infoshop`)

**Architecture:**

- Backend: Express.js + Prisma + PostgreSQL
- Frontend: React + Vite + Zustand
- Monorepo structure with separate backend/frontend

**Key Services Implemented:**

1. **Core Domain**
   - Book management (CRUD, lookup, bulk processing)
   - Category & Subject taxonomy
   - Supplier management
   - Event management
   - User/auth system

2. **Integrations**
   - Square POS integration (sales, sync)
   - Open Library API (book lookup)
   - CSV import/export

3. **E-commerce**
   - Shopping cart
   - Three-tier pricing (cost/member/sell)
   - Stock management

4. **CMS Features**
   - Page management
   - Content blocks
   - Theme system
   - Configuration

### New Payload Workspace (`/home/axxs/infoshop-payload`)

**Architecture:**

- Unified: Payload CMS + Next.js 15 + React 19
- Single codebase (admin + API + frontend)
- SQLite (development) → PostgreSQL (production)

**Collections Configured:**

- Users, Media, Books, Categories, Subjects, Suppliers, Events

**Missing from Payload:**

- Frontend customer UI
- Square integration
- Shopping cart logic
- Bulk import tools
- CMS content management

---

## Migration Strategy

### Phase 1: Foundation Setup (Week 1)

**Goal:** Establish Payload as working development environment

#### Tasks:

1. **Git Integration**

   ```bash
   cd /home/axxs/infoshop-payload
   git init
   git add .
   git commit -m "Initial Payload CMS setup

   - 7 collections configured
   - Import map generated
   - Production-ready base"
   ```

2. **Claude Code Infrastructure Alignment**
   - Copy `.claude/` directory from infoshop to infoshop-payload
   - Update paths and project-specific configs
   - Add Payload-specific commands
   - Configure quality plugins for Next.js/Payload patterns

3. **Environment Setup**
   - Create `.env.local` for development
   - Configure PostgreSQL connection for production
   - Set up Payload secrets
   - Configure media storage

4. **Documentation**
   - Update README.md with Payload-specific setup
   - Document collection schemas
   - Create development guide

**Deliverable:** Working Payload environment with proper tooling

---

### Phase 2: Data Migration (Week 2)

**Goal:** Migrate existing PostgreSQL data to Payload

#### Tasks:

1. **Database Audit**
   - Export existing data from PostgreSQL
   - Map Prisma models → Payload collections
   - Identify data transformations needed

2. **Migration Scripts**

   ```typescript
   // scripts/migrate-from-prisma.ts
   // - Books: map pricing, stock, relationships
   // - Categories: preserve hierarchy
   // - Events: migrate registrations
   // - Users: migrate roles and auth data
   ```

3. **Data Validation**
   - Verify all records migrated
   - Check relationship integrity
   - Validate user auth works

**Deliverable:** All existing data in Payload with verification tests

---

### Phase 3: Core Features (Weeks 3-4)

**Goal:** Rebuild critical business logic in Payload

#### 3.1 Collection Enhancements

**Books Collection:**

```typescript
// Add hooks for:
- Price validation (cost < member < sell)
- Stock level warnings
- Universal identifier lookup integration
```

**Events Collection:**

```typescript
// Add features:
- Capacity tracking
- Registration management
- Automatic status updates (past/upcoming)
```

#### 3.2 Custom Endpoints

**Square Integration:**

```typescript
// src/endpoints/square-sync.ts
export const squareSyncEndpoint = {
  path: '/square/sync',
  method: 'post',
  handler: async (req) => {
    // Migrate square sync logic
  },
}
```

**Book Lookup:**

```typescript
// src/endpoints/book-lookup.ts
export const bookLookupEndpoint = {
  path: '/books/lookup/:isbn',
  method: 'get',
  handler: async (req) => {
    // Migrate Open Library integration
  },
}
```

#### 3.3 Admin UI Customization

```typescript
// src/collections/Books.ts
export const Books = {
  // ...
  admin: {
    components: {
      views: {
        Edit: {
          Default: {
            actions: [
              // Custom: Lookup ISBN
              // Custom: Bulk import
              // Custom: Generate barcode
            ],
          },
        },
      },
    },
  },
}
```

**Deliverable:** Feature parity with custom backend

---

### Phase 4: Frontend Development (Weeks 5-6)

**Goal:** Build customer-facing storefront

#### 4.1 Next.js App Structure

```
src/app/
├── (payload)/           # Admin routes (Payload handles)
│   └── admin/[[...segments]]/
├── (public)/            # Public storefront
│   ├── page.tsx         # Homepage
│   ├── shop/
│   │   ├── page.tsx     # Book listing
│   │   └── [id]/        # Book details
│   ├── events/
│   │   └── page.tsx     # Events calendar
│   └── cart/
│       └── page.tsx     # Shopping cart
└── api/
    └── cart/            # Cart API routes
```

#### 4.2 Component Migration

Migrate React components from `/home/axxs/infoshop/frontend/src/components`:

- BookCard, BookGrid, BookDetail
- EventCard, EventCalendar
- Cart, CartItem
- Navigation, Footer

#### 4.3 State Management

**Option A: Server Components (Recommended)**

- Use Next.js Server Components
- Server Actions for mutations
- Minimal client-side state

**Option B: Zustand (If needed)**

- Migrate cart state management
- Keep client state minimal

#### 4.4 Styling

- Copy existing CSS/Tailwind config
- Adapt to Next.js App Router conventions
- Ensure mobile-responsive

**Deliverable:** Complete customer storefront

---

### Phase 5: Testing & Deployment (Week 7)

**Goal:** Production-ready application

#### Tasks:

1. **Testing**
   - Unit tests for hooks and utilities
   - Integration tests for custom endpoints
   - E2E tests for critical flows

2. **Performance**
   - Image optimization
   - API caching
   - Database query optimization

3. **Security**
   - Auth configuration
   - Rate limiting
   - Input validation

4. **Deployment**
   - Set up production database (PostgreSQL)
   - Configure environment variables
   - Deploy to hosting (Vercel/Payload Cloud/VPS)

**Deliverable:** Live production application

---

## Feature Migration Checklist

### Must Have (Phase 3) - ✅ COMPLETE

- [x] Book CRUD (Payload handles)
- [x] Category management (Payload handles)
- [x] User authentication (Payload handles)
- [x] Three-tier pricing validation (collection hooks)
- [x] Stock management (Sales & SaleItems collections)
- [x] ISBN/UPC lookup (Open Library API integration)
- [x] Square sync (catalog synchronization - Phase 3.4)
- [x] Sales management (Sales & SaleItems with validation)
- [ ] Event management with capacity (deferred)
- [ ] Bulk CSV import (exists in legacy, needs migration)

### Phase 4: Extended Features - 🔄 IN PROGRESS

#### Completed

- [x] Point of Sale interface (Phase 4.2)
- [x] Square Payments integration (Phase 4.3)
- [x] Sales analytics dashboard (Phase 4.4)
  - [x] Revenue tracking API
  - [x] Daily sales reports
  - [x] Product sales analysis
  - [x] CSV export functionality
  - [x] Interactive charts and widgets

#### Pending

- [ ] Customer storefront
- [ ] Shopping cart
- [ ] Book search & filters
- [ ] Event registration
- [ ] Member pricing display

### Nice to Have (Phase 5+)

- [ ] CMS page builder
- [ ] Theme customization
- [ ] Advanced reporting (partially complete with Phase 4.4)
- [ ] Email notifications
- [ ] Wishlist functionality

---

## Claude Code Infrastructure Alignment

### Current Infoshop Setup

- Custom commands in `.claude/commands/`
- Quality plugins configured
- Session-specific rules

### Payload Alignment Needed

1. **Copy Infrastructure**

   ```bash
   cp -r /home/axxs/infoshop/.claude /home/axxs/infoshop-payload/
   ```

2. **Update Project-Specific Files**
   - `.claude/CLAUDE.md` - Update project context
   - Commands - Add Payload-specific commands
   - Hooks - Adjust for Next.js patterns

3. **Add Payload Commands**

   ```markdown
   # .claude/commands/payload-generate.md

   Generate Payload types and import map:
   npm run generate:types
   npm run generate:importmap
   ```

4. **Quality Plugin Adjustments**
   - TypeScript config for Next.js App Router
   - ESLint rules for Payload patterns
   - Prettier config alignment

---

## Risk Mitigation

### Data Loss Prevention

- ✅ Keep existing database running during migration
- ✅ Export full database backup before migration
- ✅ Run migration in test environment first
- ✅ Maintain rollback scripts

### Feature Continuity

- ✅ Phase migrations allow parallel operation
- ✅ Keep custom backend running until Phase 4 complete
- ✅ Gradual traffic cutover

### Team Knowledge

- ✅ Document Payload patterns in `.agent/`
- ✅ Create SOPs for common tasks
- ✅ Maintain comparison guides

---

## Success Criteria

### Phase 1-2 (Foundation) - ✅ COMPLETE

- [x] Payload running locally without errors
- [x] Git repository initialized and configured
- [x] Admin UI fully functional
- [x] Collections configured with proper validation
- [ ] All existing data migrated successfully (deferred)

### Phase 3 (Core Features) - ✅ COMPLETE

- [x] All critical business logic working
- [x] Square catalog sync operational
- [x] Book validation hooks implemented
- [x] Sales collection with complete business logic
- [x] Open Library API integration
- [ ] Bulk CSV import tools (needs migration from legacy)

### Phase 4 (Extended Features) - 🔄 60% COMPLETE

- [x] Point of Sale interface complete
- [x] Square Payments integration operational
- [x] Sales analytics dashboard with reporting
- [x] Admin UI for sales management
- [ ] Customer storefront
- [ ] Shopping cart functional
- [ ] Mobile-responsive public site

### Phase 5 (Production)

- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Deployed to production

---

## Timeline Summary

| Phase                   | Duration    | Status            | Completion Date |
| ----------------------- | ----------- | ----------------- | --------------- |
| Phase 1: Foundation     | 1 week      | ✅ Complete       | 2025-10-15      |
| Phase 2: Data Migration | 1 week      | ⏸️ Deferred       | TBD             |
| Phase 3: Core Features  | 2 weeks     | ✅ Complete       | 2025-10-28      |
| Phase 4: Extended       | 3 weeks     | 🔄 In Progress    | ~60% Complete   |
| Phase 5: Deployment     | 1 week      | ⏳ Pending        | TBD             |
| **Total**               | **8 weeks** | **~70% Complete** |                 |

### Phase 4 Progress Breakdown:

- ✅ Phase 4.1: Sales Collection & Validation (Complete)
- ✅ Phase 4.2: Point of Sale Interface (Complete)
- ✅ Phase 4.3: Square Payments Integration (Complete)
- ✅ Phase 4.4: Sales Analytics Dashboard (Complete)
- ⏳ Phase 4.5: Customer Storefront (Pending)
- ⏳ Phase 4.6: Shopping Cart (Pending)

---

## Immediate Next Steps

### Current Status (As of 2025-11-04)

- ✅ Git repository configured with proper workflow
- ✅ Claude Code infrastructure aligned
- ✅ Admin users functional
- ✅ Core collections and validation complete
- ✅ Square integration operational (catalog sync + payments)
- ✅ Sales management and analytics complete

### Next Priorities

1. **Phase 4.5: Customer Storefront (2-3 weeks)**
   - Public-facing Next.js routes in `src/app/(public)/`
   - Book listing and search functionality
   - Book detail pages with pricing display
   - Category/subject browsing
   - Mobile-responsive design

2. **Phase 4.6: Shopping Cart (1 week)**
   - Cart state management (Server Components + cookies)
   - Add to cart functionality
   - Cart page with quantity adjustments
   - Checkout flow integration with Square

3. **Data Migration (deferred until storefront complete)**
   - Export existing PostgreSQL data from legacy system
   - Write migration scripts for Books, Categories, Sales
   - Validate data integrity
   - Run production migration

4. **Phase 5: Production Deployment**
   - Comprehensive test coverage
   - Performance optimization
   - Security audit
   - Production database setup (PostgreSQL)
   - Deploy to hosting platform

---

## Repository Structure After Migration

```
/home/axxs/infoshop-payload/           # PRIMARY WORKSPACE
├── src/
│   ├── collections/                   # Payload collections
│   ├── endpoints/                     # Custom API endpoints
│   ├── hooks/                         # Payload hooks
│   ├── app/                          # Next.js app
│   │   ├── (payload)/                # Admin
│   │   ├── (public)/                 # Storefront
│   │   └── api/                      # Additional APIs
│   ├── components/                   # React components
│   └── utils/                        # Shared utilities
├── .claude/                          # Claude Code infrastructure
├── scripts/                          # Migration & utility scripts
└── tests/                           # Test suites

/home/axxs/infoshop/                  # LEGACY (archive after migration)
├── backend/                          # Reference only
└── frontend/                         # Reference only
```

---

## Decision Points

### Database Choice

**Recommended:** PostgreSQL (production), SQLite (development)

- Matches existing Prisma setup
- Better for production workloads
- Easy migration path

### Hosting Choice

**Options:**

1. **Payload Cloud** - Fully managed, optimized for Payload
2. **Vercel** - Next.js optimized, good free tier
3. **VPS** - Full control, requires maintenance

### Frontend Framework

**Decision:** Use Next.js App Router with Server Components

- Modern React patterns
- Better performance
- Simpler state management
- SEO benefits

---

## Questions to Resolve

1. **Square Integration Timing:** Migrate immediately or defer to Phase 4?
2. **Frontend Framework:** Server Components only or mix with Client Components?
3. **Database:** Migrate to PostgreSQL now or stay with SQLite for development?
4. **Hosting:** Where to deploy production?

---

## Completed Phases Summary

### Phase 1: Foundation (✅ Complete - Oct 2025)

- Initialized Git repository with proper branch workflow
- Configured Payload CMS with 7 core collections
- Set up Claude Code infrastructure
- Created development environment with SQLite

### Phase 3: Core Features (✅ Complete - Oct 2025)

**Key Deliverables:**

- **Open Library API Integration** - ISBN/UPC book lookup (PR #3)
- **Square Catalog Sync** - Product synchronization with Square POS (PR #4)
- **Collection Validation Hooks** - Price validation, stock management
- **Sales & SaleItems Collections** - Complete sales tracking with business logic

### Phase 4: Extended Features (🔄 60% Complete - Nov 2025)

**Completed:**

- **Phase 4.1**: Sales Collection with comprehensive validation
- **Phase 4.2**: Point of Sale Interface (PR #5)
- **Phase 4.3**: Square Payments Integration (PR #6, #7)
- **Phase 4.4**: Sales Analytics Dashboard (PR #8)
  - Revenue tracking API with day/week/month grouping
  - Daily sales reports with payment method breakdown
  - Product sales analysis with top sellers
  - CSV export for external analysis
  - Integer cents arithmetic for financial precision
  - Interactive charts and widgets

**Pending:**

- Phase 4.5: Customer Storefront
- Phase 4.6: Shopping Cart

### Notable Achievements

- **Production-Ready Code Quality**: Zero tolerance enforcement via hooks
- **Financial Precision**: Integer cents arithmetic eliminates floating-point errors
- **Comprehensive Testing**: Integration tests for all critical paths
- **Security**: Input validation, rate limiting, proper error handling
- **Performance**: Efficient queries with pagination and caching

---

## Conclusion

This migration represents a strategic shift from custom infrastructure to a batteries-included CMS. The phased approach has proven successful, with ~70% completion and all core business features operational.

**Current Status:** Ready to proceed with Phase 4.5 (Customer Storefront)
**Last Updated:** 2025-11-04
