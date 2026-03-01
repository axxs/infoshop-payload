# .agent Documentation System

This directory contains token-optimised documentation for Claude Code to quickly understand the Infoshop Payload project without reading the entire codebase.

## Purpose

- **Reduce context usage** by 30-50% for similar features
- **Faster feature development** with reusable patterns
- **Cumulative knowledge** that improves over time

## Directory Structure

```
.agent/
├── README.md               # This file
├── system/                 # Core system documentation
│   ├── project-architecture.md
│   ├── database-schema.md
│   ├── api-endpoints.md
│   └── key-components.md
├── planning/               # Migration and roadmap planning
│   └── MIGRATION_PLAN.md
├── task/                   # Completed implementation patterns
│   └── (task docs added as features are built)
└── SOPs/                   # Standard Operating Procedures
    └── (SOPs added as processes are documented)
```

## How to Use

### Before Starting a Feature

1. **Read this README** to understand the documentation system
2. **Check `system/` docs** relevant to your feature:
   - Working with collections? → `database-schema.md`
   - Adding API routes? → `api-endpoints.md`
   - Modifying UI? → `key-components.md`
3. **Look in `task/`** for similar implementations
4. **Check `SOPs/`** for process guidelines

### After Completing a Feature

1. **Update system docs** if architecture changed
2. **Create task doc** to document your implementation approach
3. **Write SOP** if process is repeatable

## System Documentation Overview

| File                      | What It Contains                                                 | When to Read             |
| ------------------------- | ---------------------------------------------------------------- | ------------------------ |
| `project-architecture.md` | Payload 3.x architecture, Next.js structure, collection patterns | Starting any feature     |
| `database-schema.md`      | 12 collections + 3 globals, relationships, hooks                 | Working with data models |
| `api-endpoints.md`        | REST/GraphQL APIs, custom endpoints, auth actions                | Building APIs            |
| `key-components.md`       | Collection configs, hooks, access control, auth system           | Extending Payload        |

## Current Status

**12 collections**: Users, Media, Books, Categories, Subjects, Suppliers, Events, EventAttendance, Sales, SaleItems, ContactSubmissions, Inquiries

**3 globals**: Theme, Layout, StoreSettings

### All Completed Phases

- Phase 1: Foundation (Payload CMS 3.62.0, Next.js 15.4.8)
- Phase 2: Data migration (N/A - clean slate)
- Phase 3: Core integrations (Square, ISBN lookup, CSV import)
- Phase 4: Sales system (POS, cart, checkout, analytics, storefront)
- Phase 5: Events system (registration, calendar, capacity)
- Phase 6: Theme system (CSS vars, blocks, dark mode)
- Phase 7: Store settings, contact form, inquiry system, customer auth
- Pending: Phase 8 (Production deployment)

### Key Implementation Guides (task/)

- `task/theme-system.md` - Theme architecture documentation
- `task/theme-setup-guide.md` - Quick setup guide
- `task/phase-5-events-system.md` - Event registration system
- `task/phase-4-6-shopping-cart.md` - Shopping cart implementation
- `task/csv-bulk-import.md` - CSV import system
- `task/phase-3-open-library-integration.md` - ISBN lookup
- `task/phase-3-square-integration.md` - Square POS sync

### SOPs

- `SOPs/adding-collections.md` - Adding new collections
- `SOPs/troubleshooting.md` - Common issue resolution

---

Last Updated: 2026-03-01
Project: Infoshop Payload CMS
