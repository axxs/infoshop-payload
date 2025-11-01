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
  }
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
  }
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
            ]
          }
        }
      }
    }
  }
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

### Must Have (Phase 3)
- [x] Book CRUD (Payload handles)
- [x] Category management (Payload handles)
- [x] User authentication (Payload handles)
- [ ] Three-tier pricing validation
- [ ] Stock management
- [ ] ISBN/UPC lookup
- [ ] Square sync
- [ ] Event management with capacity
- [ ] Bulk CSV import

### Should Have (Phase 4)
- [ ] Customer storefront
- [ ] Shopping cart
- [ ] Book search & filters
- [ ] Event registration
- [ ] Member pricing display

### Nice to Have (Phase 5+)
- [ ] CMS page builder
- [ ] Theme customization
- [ ] Advanced reporting
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

### Phase 1-2 (Foundation)
- [ ] Payload running locally without errors
- [ ] All existing data migrated successfully
- [ ] Admin UI fully functional

### Phase 3 (Features)
- [ ] All critical business logic working
- [ ] Square integration operational
- [ ] Bulk import tools available

### Phase 4 (Frontend)
- [ ] Customer storefront complete
- [ ] Shopping cart functional
- [ ] Mobile-responsive

### Phase 5 (Production)
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Deployed to production

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Foundation | 1 week | 🔄 Ready to start |
| Phase 2: Data Migration | 1 week | ⏳ Pending |
| Phase 3: Core Features | 2 weeks | ⏳ Pending |
| Phase 4: Frontend | 2 weeks | ⏳ Pending |
| Phase 5: Deployment | 1 week | ⏳ Pending |
| **Total** | **7 weeks** | |

---

## Immediate Next Steps

1. **This Week:**
   - Set up Git in infoshop-payload
   - Copy Claude Code infrastructure
   - Create first admin user in Payload
   - Test CRUD operations

2. **Next Week:**
   - Export existing PostgreSQL data
   - Write migration scripts
   - Run test migration

3. **Weeks 3-4:**
   - Build custom endpoints
   - Implement hooks and validation
   - Migrate Square integration

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

## Conclusion

This migration represents a strategic shift from custom infrastructure to a batteries-included CMS. The POC validated that Payload can handle all critical features, and the phased approach minimizes risk while maintaining development velocity.

**Recommendation:** Proceed with migration, starting with Phase 1 immediately.
