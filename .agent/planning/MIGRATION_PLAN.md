# Infoshop Migration Plan: Custom Codebase → Payload CMS

## Executive Summary

**Goal:** Migrate from custom Express + React architecture to Payload CMS as the primary development workspace.

**Status:** Migration ~95% complete. All core features implemented. Production deployment pending.

---

## Completed Phases

### Phase 1: Foundation (Oct 2025)

- Initialized Git repository with branch workflow
- Configured Payload CMS with core collections
- Set up Claude Code infrastructure
- Created development environment with SQLite

### Phase 2: Data Migration (Oct 2025)

- Determined unnecessary (no production data in legacy DB)
- Created Prisma-to-Payload field mapping documentation
- Clean slate approach adopted

### Phase 3: Core Features (Oct 2025)

- Open Library API integration for ISBN lookup
- Square catalog sync with Square POS
- Collection validation hooks (pricing, stock, ISBN format)
- Sales & SaleItems collections with business logic

### Phase 4: Extended Features (Nov 2025)

- Phase 4.1: Sales Collection with comprehensive validation
- Phase 4.2: Point of Sale Interface
- Phase 4.3: Square Payments Integration
- Phase 4.4: Sales Analytics Dashboard (revenue, daily sales, product analysis, CSV export)
- Phase 4.5: Customer Storefront (shop pages, book detail, search/filters)
- Phase 4.6: Shopping Cart & Checkout (encrypted cookies, Square Web Payments)

### Phase 5: Events System (Dec 2025)

- Event registration with capacity management and waitlist
- Public event pages with calendar view
- EventAttendance collection with hooks
- Check-in functionality

### Phase 6: Theme System (Jan 2026)

- CSS variable theming with Tailwind v4
- Block-based content composition (Hero, BookShowcase, Content, CTA, Media, Archive)
- Two production themes: Default (blue) and Radical (red/black)
- Dark mode support (auto/light/dark)
- Layout global with header/footer/homepage blocks
- Draft/publish versioning with live preview

### Phase 7: Store Settings, Contact, Auth, Inquiries (Feb-Mar 2026)

- StoreSettings global (payment toggle, Square status)
- Contact form with ContactSubmissions collection
- Inquiry system (fallback when payments disabled)
- CSV bulk import with validation and duplicate detection
- Multi-source ISBN lookup (Open Library, Google Books, WorldCat)
- Customer self-registration with role enforcement
- Login/logout with JWT cookies
- Account landing page
- Anonymous checkout (no auth required for payment)
- Header user icon with auth state

---

## Current State (Mar 2026)

### Collections (12)

Users, Media, Books, Categories, Subjects, Suppliers, Events, EventAttendance, Sales, SaleItems, ContactSubmissions, Inquiries

### Globals (3)

Theme, Layout, StoreSettings

### Key Capabilities

- Full book inventory management with ISBN lookup and CSV import
- Square POS integration (payments, catalog sync, refunds)
- Customer storefront with cart and checkout
- Customer auth (registration, login, account pages)
- Event system with registration and capacity
- Contact form and inquiry system
- Admin-configurable themes with live preview
- Sales analytics and reporting

---

## Remaining Work

### Phase 8: Production Deployment

- [ ] Comprehensive test coverage audit
- [ ] Performance optimization
- [ ] Security audit
- [ ] Production database setup (PostgreSQL on Coolify)
- [ ] Cloud storage configuration (S3/GCS)
- [ ] Email provider setup (for notifications)
- [ ] Deploy to Coolify

### Future Features (Post-Launch)

- Email verification and password reset
- Account profile editing and address management
- MFA (TOTP)
- Order history and tracking for customers
- Email notifications for orders
- Abandoned cart recovery
- Gift cards and discount codes
- Wishlist functionality
- CMS page builder

---

## Feature Checklist

### Core (Complete)

- [x] Book CRUD with validation hooks
- [x] Category hierarchy
- [x] Subject tagging with indexed lookups
- [x] User auth with role-based access
- [x] Three-tier pricing validation
- [x] Stock management with low-stock alerts
- [x] ISBN lookup (Open Library, Google Books, WorldCat)
- [x] CSV bulk import with preview/validation
- [x] Square catalog sync
- [x] Square card payments
- [x] Sales & SaleItems with receipt generation
- [x] Event registration with capacity/waitlist
- [x] Contact form submissions
- [x] Book inquiry system (payments-off fallback)

### Storefront (Complete)

- [x] Book browsing with categories/subjects
- [x] Book detail pages
- [x] Shopping cart (encrypted cookies)
- [x] Checkout flow (payment + inquiry modes)
- [x] Customer self-registration
- [x] Login/logout
- [x] Account landing page
- [x] Anonymous checkout support
- [x] Event pages with calendar view

### Admin (Complete)

- [x] POS interface
- [x] Sales analytics dashboard
- [x] Theme management with live preview
- [x] Layout management (header/footer/homepage)
- [x] Store settings (payment toggle)
- [x] Contact/inquiry management

### Pending

- [ ] Email verification
- [ ] Password reset
- [ ] Production deployment
- [ ] Cloud storage
- [ ] Email notifications

---

Last Updated: 2026-03-01
