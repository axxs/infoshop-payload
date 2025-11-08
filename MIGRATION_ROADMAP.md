# Infoshop Migration Roadmap

## From Express/Prisma/React to Payload CMS/Next.js

**Last Updated**: 2025-11-08
**Current Status**: Phase 5 (Events System) - ✅ Complete

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

| Phase                          | Status      | Completion |
| ------------------------------ | ----------- | ---------- |
| Phase 1: Foundation            | ✅ Complete | 100%       |
| Phase 2: Data Migration        | ✅ Complete | 100% (N/A) |
| Phase 3: Core Integrations     | ✅ Complete | 100%       |
| Phase 4: Sales System          | ✅ Complete | 100%       |
| Phase 5: Events System         | ✅ Complete | 100%       |
| Phase 6: Theme System Planning | 📅 Next     | 0%         |
| Phase 7: Public Storefront/CMS | 📅 Planned  | 0%         |
| Phase 8: Advanced Features     | 📅 Planned  | 0%         |

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

### ✅ Phase 3: Core Integrations (Complete)

#### Completed (Phase 3.1-3.7)

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

**3.5 Collection Hooks** ✅

- [x] Stock level validation (prevents negative quantities)
- [x] Low stock warnings (Payload logger with structured data)
- [x] Price validation (cost ≤ member ≤ sell hierarchy)
- [x] ISBN format validation (ISBN-10 and ISBN-13)
- [x] Auto-calculate stock status (OUT_OF_STOCK, LOW_STOCK, IN_STOCK)
- [x] Digital product handling (unlimited stock)
- [x] beforeChange/afterChange hooks

**3.6 Admin UI Enhancements** ✅

- [x] Custom book actions (ISBN lookup button with auto-population)
- [x] Stock level indicators (color-coded badges in list view)
- [x] Type-safe components with comprehensive JSDoc
- [x] Error handling for all user interactions
- [x] Tailwind CSS for consistent styling

**3.7 CSV Bulk Import** ✅

- [x] CSV parsing and validation
- [x] Book import with metadata
- [x] Duplicate detection strategies
- [x] Error handling and reporting
- [x] Preview before import
- [x] Subject auto-linking from ISBN lookup
- [x] Integration tests

---

### 🔄 Phase 4: Sales System (95% Complete)

**Priority**: HIGH - Core business functionality

#### ✅ Completed (Phase 4.1-4.7)

**4.1 Collections & Data Models** ✅

- [x] Sale transaction model
- [x] Payment method tracking
- [x] Square transaction linking
- [x] Receipt URL storage
- [x] User/customer relationship
- [x] Sale date and totals
- [x] SaleItem line item model
- [x] Quantity and pricing
- [x] Discount handling
- [x] Book/Sale relationships

**4.2 POS Interface** ✅

- [x] Admin POS screen
- [x] Product search/barcode scanning
- [x] Cart management
- [x] Price calculations (member discounts)
- [x] Payment processing (Square)
- [x] Receipt generation
- [x] Email receipts

**4.3 Square Payments Integration** ✅

- [x] Square Web Payments SDK with sandbox/production detection
- [x] Payment tokenization and processing
- [x] Multi-currency support (AUD default)
- [x] Complete checkout flow integration
- [x] Receipt URL storage
- [x] Transaction reconciliation
- [x] Type-safe relationship handling utilities
- [x] Comprehensive error handling

**4.4 Reporting & Analytics** ✅

- [x] Daily sales reports
- [x] Weekly/monthly summaries
- [x] Product sales analysis
- [x] Revenue tracking
- [x] Export functionality

**4.5 Customer Storefront** ✅

- [x] Public book browsing interface
- [x] Search and filtering by category/subject
- [x] Book detail pages
- [x] Stock status display
- [x] Member vs retail pricing display
- [x] Grid and list view options

**4.6 Shopping Cart & Checkout** ✅

- [x] Server-side cart state management (encrypted cookies)
- [x] Add to cart functionality
- [x] Cart page with quantity management
- [x] Remove items from cart
- [x] Multi-currency support (USD, EUR, GBP, AUD)
- [x] Member pricing support
- [x] Stock validation on cart operations
- [x] Checkout page with order summary
- [x] Order creation (Sale/SaleItem records)
- [x] Automatic stock reduction
- [x] Tax calculation (10% GST for AUD)
- [x] Integration and E2E tests

**4.7 Order Management** ✅

- [x] Customer order history page (`/account/orders`)
- [x] Order detail page with full information
- [x] Order status tracking (PENDING, PROCESSING, COMPLETED, CANCELLED, REFUNDED)
- [x] Status history audit trail with timestamps
- [x] Order cancellation workflow with reason capture
- [x] Automatic stock restoration on cancellation
- [x] Server actions for order management

#### 📋 Remaining (Phase 4.8) - Optional Enhancements

**4.8 Advanced Features** 📅

- [ ] Email notifications for order status changes (recommended)
- [ ] Shipping address collection (if needed for online orders)
- [ ] Guest checkout support (optional)

**Deferred to Phase 8:**

- Gift cards and discount codes
- Abandoned cart recovery
- Wishlist functionality
- Admin bulk order actions

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

### ✅ Phase 5: Events System (Complete)

**Priority**: HIGH - Community engagement and events

#### 5.1 Event Management Backend ✅

**Completed:**

- [x] Basic Event collection (title, description, dates, location)
- [x] Event types (book signing, reading, discussion, workshop, screening, meeting, other)
- [x] Capacity tracking (max attendees, current attendees)
- [x] Event status (upcoming, ongoing, completed, cancelled)
- [x] Pricing (free/paid events)
- [x] EventAttendance collection (user registrations)
- [x] Registration workflow (authenticated users)
- [x] Attendance limits and waitlist management
- [x] Check-in system for event day
- [x] Server actions (registerForEvent, cancelRegistration, checkInAttendee, etc.)
- [x] Collection hooks (capacity validation, duplicate prevention, count synchronization)
- [x] Integration tests (11/11 passing - 100%)
- [x] Comprehensive documentation (.agent/task/phase-5-events-system.md)

#### 5.2 Event Management Frontend ✅

**Completed:**

- [x] Public event listing page with search and filtering
- [x] Event detail page with registration form
- [x] Event calendar view (monthly/weekly)
- [x] User event dashboard (/account/events)
- [x] Frontend UI components (EventCard, EventGrid, EventFilters, EventCalendar)
- [x] Client-side registration interaction (RegisterButton)
- [x] Responsive design (mobile/tablet/desktop)
- [x] Loading and error states
- [x] Empty state handling

**Deferred to Phase 5.3:**

- [ ] Email notifications (registration confirmation, reminders)
- [ ] Event series/recurring events
- [ ] Event categories/tags
- [ ] Automatic waitlist promotion when spots open
- [ ] iCal export
- [ ] QR code check-in
- [ ] Guest registration (non-authenticated)

**Old System Reference:**

```prisma
model EventAttendance {
  id           String
  eventId      String
  userId       String
  registeredAt DateTime
  status       String  // registered, attended, cancelled, waitlist
}
```

---

### 📅 Phase 6: Theme System Planning (Not Started)

**Priority**: HIGH - Foundation for customizable public website

**Note**: This phase focuses on planning and architectural design for the theme/template system before implementation in Phase 7.

#### 6.1 Research & Requirements

- [ ] Analyze theme requirements (design flexibility, ease of customization)
- [ ] Research Payload CMS theming best practices
- [ ] Evaluate existing Next.js theme solutions
- [ ] Define theme switching mechanism
- [ ] Design template hierarchy
- [ ] Plan component library structure

#### 6.2 Architecture Design

**Theme System Design:**

- [ ] Theme configuration schema (colors, fonts, layouts)
- [ ] Template structure (page layouts, components)
- [ ] Asset management (images, fonts, CSS)
- [ ] Theme preview system
- [ ] Version control strategy
- [ ] Migration path between themes

**Technical Decisions:**

- [ ] CSS-in-JS vs Tailwind vs CSS Modules
- [ ] Component composition strategy
- [ ] Dynamic vs static theming
- [ ] Performance considerations
- [ ] SEO implications
- [ ] Accessibility requirements

#### 6.3 Deliverables

- [ ] Theme system architecture document
- [ ] Component library specification
- [ ] Implementation roadmap
- [ ] Theme template examples
- [ ] Developer documentation

**Success Criteria:**

- Clear, well-documented theme system architecture
- Proof-of-concept theme implementation
- Buy-in from team on approach
- Ready to begin Phase 7 implementation

---

### 📅 Phase 7: Public Storefront/CMS (Not Started)

**Priority**: HIGH - Public-facing website implementation

**Note**: This phase implements the architecture designed in Phase 6.

#### 7.1 Content Management System

**Page Collection:**

- [ ] Page creation and editing
- [ ] Rich content blocks (Lexical editor integration)
- [ ] SEO metadata (title, description, OG tags)
- [ ] Publishing workflow (draft/published/scheduled)
- [ ] Slug management and URL structure
- [ ] Page templates (home, about, contact, etc.)

**Navigation System:**

- [ ] Menu management collection
- [ ] Nested navigation support
- [ ] Footer links
- [ ] Dynamic menu generation

#### 7.2 Theme Implementation

**Theme System:**

- [ ] Implement designed theme architecture
- [ ] Default theme creation
- [ ] Theme switching mechanism
- [ ] Custom CSS/styling per theme
- [ ] Theme configuration UI
- [ ] Asset management for themes

**Component Library:**

- [ ] Reusable layout components
- [ ] Typography system
- [ ] Color system
- [ ] Responsive design utilities
- [ ] Accessibility features

#### 7.3 Public Website Features

**Storefront:**

- [ ] Enhanced public book browsing (already partially complete)
- [ ] Advanced search and filtering
- [ ] Category/subject landing pages
- [ ] Featured books section
- [ ] New arrivals showcase
- [ ] Staff picks/recommendations

**Content Pages:**

- [ ] Home page (customizable)
- [ ] About page
- [ ] Contact page
- [ ] Events listing page (integrate with Phase 5)
- [ ] Blog/news section (optional)

**User Features:**

- [ ] Customer accounts (already partially complete)
- [ ] Order history (already complete)
- [ ] Wishlist functionality
- [ ] Book reviews/ratings (optional)

#### 7.4 Performance & SEO

- [ ] Image optimization
- [ ] Static site generation for content pages
- [ ] SEO metadata management
- [ ] Sitemap generation
- [ ] Schema.org structured data
- [ ] Performance monitoring

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
}
```

---

### 📅 Phase 8: Advanced Features (Not Started)

**Priority**: LOW - Nice to have enhancements

#### 8.1 Configuration System

**Configuration Collection:**

- [ ] System-wide settings
- [ ] Shop information
- [ ] Email templates
- [ ] Feature flags
- [ ] Customizable business rules

#### 8.2 Advanced Sales Features

**Deferred from Phase 4:**

- [ ] Gift cards and discount codes
- [ ] Abandoned cart recovery
- [ ] Advanced wishlist functionality
- [ ] Admin bulk order actions

#### 8.3 Advanced Inventory

- [ ] Consignment tracking
- [ ] Reserve/hold system
- [ ] Stock transfer between locations
- [ ] Supplier ordering workflow
- [ ] Automatic reorder suggestions

#### 8.4 Advanced Reporting

- [ ] Custom report builder
- [ ] Scheduled reports
- [ ] Data export (CSV, PDF)
- [ ] Financial reporting
- [ ] Cooperative accounting integration

#### 8.5 Internationalization (Optional)

- [ ] Multi-language support
- [ ] Translation management
- [ ] Locale switching

---

## Migration Dependencies

### Critical Path

```
Phase 1 (Foundation) ✅
  → Phase 3 (Core Integrations) ✅
    → Phase 4 (Sales System) 🔄 95%
      → Phase 5 (Events System) 📅
        → Phase 6 (Theme Planning) 📅
          → Phase 7 (Public Storefront/CMS) 📅
```

### Parallel Work

- Phase 5 (Events) can start once Phase 4 core is complete
- Phase 8 (Advanced Features) can be developed incrementally alongside Phase 7
- Email notifications (Phase 4.8) can be developed in parallel with Phase 5

---

## Feature Comparison Matrix

| Feature              | Old System        | New System          | Status         |
| -------------------- | ----------------- | ------------------- | -------------- |
| **Core Inventory**   |
| Book Management      | ✅ Express/Prisma | ✅ Payload          | ✅ Complete    |
| Categories           | ✅ Hierarchical   | ✅ Hierarchical     | ✅ Complete    |
| Subjects             | ✅ Flat tags      | ✅ Flat tags        | ✅ Complete    |
| Suppliers            | ✅ Full CRUD      | ✅ Full CRUD        | ✅ Complete    |
| Media/Images         | ✅ Upload         | ✅ Upload           | ✅ Complete    |
| CSV Import           | ❌ None           | ✅ Full system      | ✅ Complete    |
| **Integrations**     |
| Open Library         | ❌ None           | ✅ ISBN Lookup      | ✅ Complete    |
| Square Catalog       | ✅ Sync           | ✅ Sync             | ✅ Complete    |
| Square Payments      | ✅ Payment        | ✅ Web Payments SDK | ✅ Complete    |
| **Sales**            |
| Shopping Cart        | ✅ React UI       | ✅ Server-side      | ✅ Complete    |
| Checkout Flow        | ✅ Full system    | ✅ Full system      | ✅ Complete    |
| Payment Processing   | ✅ Square         | ✅ Square (AUD)     | ✅ Complete    |
| Order Management     | ✅ Full           | ✅ Full             | ✅ Complete    |
| Sales Tracking       | ✅ Full system    | ✅ Full system      | ✅ Complete    |
| Receipts             | ✅ Generate       | ✅ Square receipts  | ✅ Complete    |
| Reporting            | ✅ Analytics      | ✅ Basic reports    | ✅ Complete    |
| Email Notifications  | ✅ Enabled        | ❌ Not yet          | 📅 Phase 4.8   |
| **Community**        |
| Events (Basic)       | ✅ Basic          | ✅ Basic            | ✅ Complete    |
| Event Registration   | ✅ Track          | ❌ Not yet          | 📅 Phase 5     |
| Event Calendar       | ✅ View           | ❌ Not yet          | 📅 Phase 5     |
| Volunteer Shifts     | ✅ Schedule       | ❌ Not needed       | ⛔ Removed     |
| Collective Decisions | ✅ Track          | ❌ Not needed       | ⛔ Removed     |
| **Website/CMS**      |
| Pages                | ✅ CMS            | ❌ Not yet          | 📅 Phase 7     |
| Content Blocks       | ✅ Flexible       | ❌ Not yet          | 📅 Phase 7     |
| Themes               | ✅ Custom         | ❌ Planning         | 📅 Phase 6     |
| Public Storefront    | ✅ React          | ✅ Basic (partial)  | 🔄 In Progress |
| **Admin**            |
| User Management      | ✅ Full           | ✅ Full             | ✅ Complete    |
| Permissions          | ✅ Roles          | ✅ Roles            | ✅ Complete    |
| Configuration        | ✅ Database       | ❌ Not yet          | 📅 Phase 8     |

---

## Recommended Next Steps

### Immediate Priorities (Complete Phase 4)

**Option A: Complete Phase 4.8 (Optional Enhancements)**

1. Email notifications for order status changes
2. Shipping address collection (if needed)
3. Guest checkout support

**Option B: Move to Phase 5 (Events System)**

Proceed directly to events system development (recommended if email notifications aren't urgent)

### Phase 5: Events System (2-3 weeks)

**Week 1: Event Attendance Foundation**

1. Create EventAttendance collection
2. Registration workflow (authenticated users)
3. Capacity tracking and limits
4. Waitlist management

**Week 2: Event Features**

1. Event calendar view (monthly/weekly)
2. Public event listing page
3. Event search and filtering
4. Check-in system

**Week 3: Polish & Integration**

1. Email notifications (registration confirmation, reminders)
2. Event categories/tags
3. Recurring events support
4. Testing and documentation

### Phase 6: Theme System Planning (1-2 weeks)

**Research & Architecture Design**

1. Research Payload CMS + Next.js theming approaches
2. Define theme configuration schema
3. Design component library structure
4. Create proof-of-concept theme
5. Document architecture decisions

### Long-Term (Phases 7-8)

**Phase 7**: Public Storefront/CMS implementation (3-4 weeks)
**Phase 8**: Advanced features as needed (ongoing)

---

## Risk Assessment

### Completed & Mitigated

- ✅ **Sales System Migration**: Successfully completed with comprehensive testing
- ✅ **Square Payments**: Implemented with sandbox testing, production-ready
- ✅ **Data Integrity**: No migration needed (clean slate implementation)

### Current Risks

**Medium Risk:**

- **Events System**: Requires careful capacity/waitlist logic to prevent overbooking
- **Theme System**: Architecture decisions will impact long-term maintainability
- **Public Storefront**: SEO and performance critical for online presence

**Low Risk:**

- **Email Notifications**: Standard functionality, well-documented patterns
- **Content Management**: Payload's native Lexical editor reduces complexity
- **Advanced Features**: Can be deferred or implemented incrementally

---

## Success Criteria

### ✅ Phase 3 Complete (Achieved)

- [x] All collection hooks implemented and tested
- [x] Admin UI enhancements deployed
- [x] CSV import/export working
- [x] No regressions in existing features

### ✅ Phase 4 Complete (Achieved)

- [x] Shopping cart and checkout working end-to-end
- [x] Sales can be processed with Square Payments
- [x] Square Payments working reliably (sandbox tested)
- [x] Receipts generating correctly (Square receipt URLs)
- [x] Order management system complete
- [x] Stock deduction automated
- [ ] Email notifications for order updates (deferred to Phase 4.8)

### ✅ Phase 5 Complete (Achieved)

- [x] EventAttendance collection implemented
- [x] Registration workflow functional
- [x] Capacity and waitlist management working
- [x] Server actions for event operations
- [x] Integration tests passing (11/11 - 100%)
- [x] Event calendar view deployed
- [x] Public event listing page live
- [x] Frontend UI components for registration
- [x] User event dashboard
- [ ] Email notifications for events working (deferred to Phase 5.3)

### Phase 6 Complete When:

- [ ] Theme architecture documented
- [ ] Component library specification complete
- [ ] Proof-of-concept theme created
- [ ] Team approves architecture approach
- [ ] Ready to begin Phase 7 implementation

### Phase 7 Complete When:

- [ ] CMS pages collection working
- [ ] Theme system implemented
- [ ] Public storefront enhanced
- [ ] Navigation system functional
- [ ] SEO metadata in place
- [ ] Performance targets met

### Migration Complete When:

- [ ] All essential features from old system implemented
- [ ] Events system fully functional
- [ ] Public website live with theme system
- [ ] Team trained on new system
- [ ] Documentation complete
- [ ] Performance meets or exceeds old system
- [ ] Old system can be safely decommissioned

---

## Notes

### Migration Achievements

- ✅ Clean slate implementation (no legacy data migration needed)
- ✅ Modern best practices from day one (TypeScript strict mode, ESLint, testing)
- ✅ Payload's native features (auth, media, API) eliminated custom code
- ✅ React Server Components provide better performance than old SPA
- ✅ Documentation system (.agent/) accelerates development
- ✅ Square sandbox integration working with proper environment detection
- ✅ Multi-currency support (AUD default) with GST calculation
- ✅ Type-safe relationship handling utilities
- ✅ Comprehensive testing (integration + E2E)

### Key Technical Decisions

- **Database**: SQLite (dev) / PostgreSQL (prod) via Drizzle ORM
- **Payments**: Square Web Payments SDK with sandbox/production auto-detection
- **Cart Storage**: Server-side encrypted cookies (JWT)
- **Currency**: AUD with 10% GST, multi-currency capable
- **Testing**: Vitest (integration) + Playwright (E2E)
- **Type Safety**: Centralized relationship ID utilities prevent runtime errors

### Removed Features (Not Needed)

- ❌ Volunteer shift management (scope reduction)
- ❌ Collective decision tracking (scope reduction)
- ❌ POS interface (online-only for now)

### Next Priorities

1. **Events System** (Phase 5) - Community engagement
2. **Theme Planning** (Phase 6) - Architecture for customizable website
3. **Public Storefront** (Phase 7) - Full public-facing website

---

**Last Updated**: 2025-11-08
**Next Review**: After Phase 5 (Events System) completion
**Current Focus**: Planning Phase 5 implementation
