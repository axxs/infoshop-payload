# Infoshop Migration Roadmap
## From Express/Prisma/React to Payload CMS/Next.js

**Last Updated**: 2025-11-02
**Current Status**: Phase 3 (Core Integrations) - 60% Complete

---

## Migration Overview

### Old System
- **Backend**: Express + Prisma + PostgreSQL
- **Frontend**: React + Mantine UI + Zustand
- **Architecture**: Separate backend/frontend repos

### New System
- **Platform**: Payload CMS 3.62.0 + Next.js 15.4.4
- **Database**: SQLite (dev) / PostgreSQL (prod) via Drizzle
- **Architecture**: Unified full-stack with React Server Components

---

## Progress Summary

| Phase | Status | Completion |
|-------|--------|------------|
| Phase 1: Foundation | ✅ Complete | 100% |
| Phase 2: Data Migration | ✅ Complete | 100% (N/A) |
| Phase 3: Core Integrations | 🔄 In Progress | 60% |
| Phase 4: Sales System | 📅 Planned | 0% |
| Phase 5: Community Features | 📅 Planned | 0% |
| Phase 6: CMS/Website | 📅 Planned | 0% |
| Phase 7: Advanced Features | 📅 Planned | 0% |

---

## Detailed Phase Breakdown

### ✅ Phase 1: Foundation (Complete)

**Completed:**
- [x] Payload CMS 3.x installation
- [x] Next.js 15.4.4 App Router setup
- [x] SQLite database for development
- [x] Git repository initialization
- [x] Quality infrastructure (ESLint, Prettier, TypeScript strict)
- [x] Testing setup (Vitest, Playwright)
- [x] .agent documentation system
- [x] Claude Code integration

**Collections Created:**
- [x] Users (authentication)
- [x] Books (inventory)
- [x] Categories (hierarchical)
- [x] Subjects (flat tags)
- [x] Suppliers (vendor management)
- [x] Events (store events)
- [x] Media (file uploads)

---

### ✅ Phase 2: Data Migration (Complete - Not Required)

**Status**: No migration needed - old database was development instance only

**Deliverables Created:**
- [x] Database audit documentation (715 lines)
- [x] Prisma-to-Payload mapping reference
- [x] Data export script template
- [x] Migration technical patterns documented

---

### 🔄 Phase 3: Core Integrations (60% Complete)

#### ✅ Completed (Phase 3.1-3.4)

**3.1 Open Library Integration** ✅
- [x] ISBN lookup API endpoint (`/api/books/lookup-isbn`)
- [x] Book metadata fetching (title, author, subjects, covers)
- [x] Cover image URL generation
- [x] Integration tests
- [x] Documentation

**3.2 Square Catalog Sync** ✅
- [x] Square SDK client configuration
- [x] Catalog sync service (create/update items)
- [x] API endpoint (`/api/square/sync`)
- [x] Three sync strategies (specific, unsynced, modified)
- [x] Batch processing with rate limiting
- [x] Security hardening (timing attack prevention)
- [x] Integration and E2E tests

#### 📋 Remaining (Phase 3.5-3.7)

**3.5 Collection Hooks** 📅
- [ ] Stock level validation
- [ ] Low stock warnings (email/notification)
- [ ] Price validation (member < sell, cost tracking)
- [ ] ISBN format validation
- [ ] Category/subject relationship validation
- [ ] Auto-slug generation for categories/subjects
- [ ] beforeChange/afterChange hooks

**3.6 Admin UI Enhancements** 📅
- [ ] Custom book actions (ISBN lookup button)
- [ ] Stock level indicators (visual warnings)
- [ ] Barcode generation
- [ ] Relationship visualisation
- [ ] Bulk operations (CSV import/export)
- [ ] Custom dashboard widgets

**3.7 API Improvements** 📅
- [ ] Advanced search/filtering
- [ ] Book availability checking
- [ ] Inventory reporting endpoints
- [ ] Sales analytics endpoints

---

### 📅 Phase 4: Sales System (Critical - Not Started)

**Priority**: HIGH - Core business functionality

#### 4.1 Collections & Data Models

**Sale Collection**
- [ ] Sale transaction model
- [ ] Payment method tracking
- [ ] Square transaction linking
- [ ] Receipt URL storage
- [ ] User/customer relationship
- [ ] Sale date and totals

**SaleItem Collection**
- [ ] Line item model
- [ ] Quantity and pricing
- [ ] Discount handling
- [ ] Book relationship
- [ ] Sale relationship

#### 4.2 POS Interface

- [ ] Admin POS screen
- [ ] Product search/barcode scanning
- [ ] Cart management
- [ ] Price calculations (member discounts)
- [ ] Payment processing (Square)
- [ ] Receipt generation
- [ ] Email receipts

#### 4.3 Square Payments Integration

- [ ] Square Payments API (separate from catalog sync)
- [ ] Payment processing flow
- [ ] Refund handling
- [ ] Receipt generation
- [ ] Transaction reconciliation

#### 4.4 Reporting & Analytics

- [ ] Daily sales reports
- [ ] Weekly/monthly summaries
- [ ] Product sales analysis
- [ ] Revenue tracking
- [ ] Export functionality

**Old System Reference:**
```prisma
model Sale {
  id                  String
  saleDate            DateTime
  totalAmount         Decimal
  paymentMethod       PaymentMethod
  squareTransactionId String?
  squareReceiptUrl    String?
  userId              String?
  items               SaleItem[]
}

model SaleItem {
  id        String
  quantity  Int
  unitPrice Decimal
  discount  Decimal
  saleId    String
  bookId    String
}
```

---

### 📅 Phase 5: Community Features (Not Started)

**Priority**: MEDIUM - Important for infoshop community

#### 5.1 Event Management (Partial)

**Completed:**
- [x] Basic Event collection

**Remaining:**
- [ ] EventAttendance collection (user registrations)
- [ ] Attendance limits and waitlist
- [ ] Event calendar view
- [ ] Email notifications
- [ ] Check-in system

#### 5.2 Volunteer Management

**VolunteerShift Collection**
- [ ] Shift scheduling
- [ ] User assignment
- [ ] Shift notes
- [ ] Shift calendar view
- [ ] Volunteer hours tracking

#### 5.3 Collective Decision Making

**CollectiveDecision Collection**
- [ ] Proposal creation
- [ ] Status tracking (proposed, approved, rejected)
- [ ] Discussion threads
- [ ] Voting system (if applicable)
- [ ] Decision history

**Old System Reference:**
```prisma
model EventAttendance {
  id           String
  eventId      String
  userId       String
  registeredAt DateTime
}

model VolunteerShift {
  id        String
  startTime DateTime
  endTime   DateTime
  notes     String?
  userId    String
}

model CollectiveDecision {
  id           String
  title        String
  description  String
  status       DecisionStatus
  outcome      String?
  proposedById String
  proposedAt   DateTime
  decidedAt    DateTime?
}
```

---

### 📅 Phase 6: CMS/Website (Not Started)

**Priority**: MEDIUM - Public-facing storefront

#### 6.1 Content Management

**Page Collection**
- [ ] Page creation and editing
- [ ] Rich content blocks
- [ ] SEO metadata
- [ ] Publishing workflow
- [ ] Template system
- [ ] Scheduled publishing

**ContentBlock Collection**
- [ ] Block types (text, image, code, embed)
- [ ] Block ordering
- [ ] Block configuration
- [ ] CSS customisation

#### 6.2 Theme System

**Theme Collection**
- [ ] Theme configuration
- [ ] Theme switching
- [ ] Default theme
- [ ] Custom CSS/styling
- [ ] Preview images

#### 6.3 Frontend Storefront

- [ ] Public book browsing
- [ ] Search and filtering
- [ ] Book detail pages
- [ ] Shopping cart
- [ ] Checkout flow
- [ ] Customer accounts
- [ ] Order history

**Old System Reference:**
```prisma
model Page {
  id              String
  title           String
  slug            String
  content         Json
  status          PageStatus
  metaTitle       String?
  metaDescription String?
  templateName    String
  publishedAt     DateTime?
  contentBlocks   ContentBlock[]
}

model ContentBlock {
  id          String
  blockType   ContentBlockType
  content     Json
  order       Int
  isVisible   Boolean
  pageId      String
}

model Theme {
  id           String
  name         String
  displayName  String
  config       Json
  isActive     Boolean
  isDefault    Boolean
}
```

---

### 📅 Phase 7: Advanced Features (Not Started)

**Priority**: LOW - Nice to have

#### 7.1 Configuration System

**Configuration Collection**
- [ ] System-wide settings
- [ ] Shop information
- [ ] Email templates
- [ ] Feature flags
- [ ] Customisable business rules

#### 7.2 Internationalization

- [ ] Multi-language support (English, Spanish, French)
- [ ] Translation management
- [ ] Locale switching

#### 7.3 Advanced Inventory

- [ ] Consignment tracking
- [ ] Reserve/hold system
- [ ] Stock transfer between locations
- [ ] Supplier ordering workflow
- [ ] Automatic reorder suggestions

#### 7.4 Advanced Reporting

- [ ] Custom report builder
- [ ] Scheduled reports
- [ ] Data export (CSV, PDF)
- [ ] Financial reporting
- [ ] Cooperative accounting integration

---

## Migration Dependencies

### Critical Path
```
Phase 1 (Foundation)
  → Phase 3 (Integrations)
    → Phase 4 (Sales System)
      → Phase 6 (Public Storefront)
```

### Parallel Work
- Phase 5 (Community) can be developed alongside Phase 4
- Phase 7 (Advanced) can be developed incrementally

---

## Feature Comparison Matrix

| Feature | Old System | New System | Status |
|---------|------------|------------|--------|
| **Core Inventory** |
| Book Management | ✅ Express/Prisma | ✅ Payload | ✅ Complete |
| Categories | ✅ Hierarchical | ✅ Hierarchical | ✅ Complete |
| Subjects | ✅ Flat tags | ✅ Flat tags | ✅ Complete |
| Suppliers | ✅ Full CRUD | ✅ Full CRUD | ✅ Complete |
| Media/Images | ✅ Upload | ✅ Upload | ✅ Complete |
| **Integrations** |
| Open Library | ❌ None | ✅ ISBN Lookup | ✅ Complete |
| Square Catalog | ✅ Sync | ✅ Sync | ✅ Complete |
| Square Payments | ✅ Payment | ❌ Not yet | 📅 Phase 4 |
| **Sales** |
| POS Interface | ✅ React UI | ❌ Not yet | 📅 Phase 4 |
| Sales Tracking | ✅ Full system | ❌ Not yet | 📅 Phase 4 |
| Receipts | ✅ Generate | ❌ Not yet | 📅 Phase 4 |
| Reporting | ✅ Analytics | ❌ Not yet | 📅 Phase 4 |
| **Community** |
| Events | ✅ Basic | ✅ Basic | ✅ Complete |
| Event Attendance | ✅ Track | ❌ Not yet | 📅 Phase 5 |
| Volunteer Shifts | ✅ Schedule | ❌ Not yet | 📅 Phase 5 |
| Decisions | ✅ Track | ❌ Not yet | 📅 Phase 5 |
| **Website/CMS** |
| Pages | ✅ CMS | ❌ Not yet | 📅 Phase 6 |
| Content Blocks | ✅ Flexible | ❌ Not yet | 📅 Phase 6 |
| Themes | ✅ Custom | ❌ Not yet | 📅 Phase 6 |
| Public Store | ✅ React | ❌ Not yet | 📅 Phase 6 |
| **Admin** |
| User Management | ✅ Full | ✅ Full | ✅ Complete |
| Permissions | ✅ Roles | ✅ Roles | ✅ Complete |
| Configuration | ✅ Database | ❌ Not yet | 📅 Phase 7 |

---

## Recommended Next Steps

### Immediate Priorities (Phase 3 Completion)

**Week 1: Collection Hooks**
1. Stock validation and low-stock warnings
2. Price validation business logic
3. Auto-slug generation
4. Relationship validation

**Week 2: Admin UI Enhancements**
1. ISBN lookup button integration
2. Stock level indicators
3. Bulk CSV import/export
4. Custom dashboard

### Medium-Term (Phase 4 - Critical)

**Week 3-4: Sales System Foundation**
1. Create Sale and SaleItem collections
2. Build POS interface in admin
3. Square Payments API integration
4. Receipt generation

**Week 5-6: Sales Completion**
1. Reporting and analytics
2. Refund handling
3. Sales history views
4. Export functionality

### Long-Term (Phases 5-7)

**Phase 5**: Community features (parallel to Phase 4 work)
**Phase 6**: Public storefront and CMS
**Phase 7**: Advanced features and polish

---

## Risk Assessment

### High Risk
- **Sales System Migration**: Critical business functionality, requires careful testing
- **Square Payments**: Financial transactions must be reliable and secure
- **Data Integrity**: Ensure no data loss during any future migrations

### Medium Risk
- **Community Features**: Requires user adoption and training
- **Public Storefront**: SEO and performance critical

### Low Risk
- **Configuration System**: Can use Payload's native config initially
- **Advanced Features**: Can be deferred if needed

---

## Success Criteria

### Phase 3 Complete When:
- [ ] All collection hooks implemented and tested
- [ ] Admin UI enhancements deployed
- [ ] CSV import/export working
- [ ] No regressions in existing features

### Phase 4 Complete When:
- [ ] POS interface fully functional
- [ ] Sales can be processed end-to-end
- [ ] Square Payments working reliably
- [ ] Receipts generating correctly
- [ ] Daily sales reports available

### Migration Complete When:
- [ ] All old system features migrated
- [ ] Old system can be decommissioned
- [ ] Team trained on new system
- [ ] Documentation complete
- [ ] Performance meets or exceeds old system

---

## Timeline Estimate

| Phase | Estimated Duration | Target Date |
|-------|-------------------|-------------|
| Phase 3 (remaining) | 2 weeks | Week of Nov 11 |
| Phase 4 (Sales) | 3-4 weeks | Week of Dec 2 |
| Phase 5 (Community) | 2 weeks | Week of Dec 16 |
| Phase 6 (CMS/Website) | 3-4 weeks | Week of Jan 6 |
| Phase 7 (Advanced) | 2-3 weeks | Week of Jan 27 |

**Total Estimated Timeline**: 12-15 weeks from now (complete by late January 2026)

---

## Notes

- Old database confirmed as development instance only - no production data to migrate
- Clean slate allows modern best practices from the start
- Payload's native features (auth, media, API) eliminate custom code
- React Server Components provide better performance than old SPA
- Documentation system (.agent/) accelerates development

---

Last Updated: 2025-11-02
Next Review: After Phase 3 completion
