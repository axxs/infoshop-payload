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
| `database-schema.md`      | Collection schemas, relationships, hooks, globals                | Working with data models |
| `api-endpoints.md`        | REST/GraphQL APIs, custom endpoints                              | Building APIs            |
| `key-components.md`       | Collection configs, hooks, plugins                               | Extending Payload        |

## Workflow

```
1. Read relevant .agent docs
2. Research existing code patterns
3. Plan implementation
4. Build feature
5. Update .agent documentation
```

## Benefits

- **Token Savings**: Less context = faster responses
- **Consistency**: Reuse proven patterns
- **Knowledge Base**: Each feature improves the system
- **Onboarding**: New developers understand faster

## Maintenance

- **Keep docs concise**: 50-200 lines per file
- **Update regularly**: After major changes
- **Remove stale info**: Delete outdated patterns
- **Use examples**: Show, don't just tell

## Current Status

✅ **System documentation complete**

- Project architecture documented
- 10 collections + 2 globals defined (see `database-schema.md`)
- Custom API endpoints documented (see `api-endpoints.md`)
- Key components identified (including Open Library integration)

✅ **Task documentation**: Growing with each feature

- Phase 3: Open Library ISBN lookup integration
- Phase 3.7: ISBN lookup enhancements (subjects, cover images)
- Phase 4.6: Shopping cart functionality
- Phase 5: Events system with registration
- CSV Bulk Import: Comprehensive book import system
- Theme System: Admin-configurable theming with live preview

✅ **SOPs**: Standard operating procedures documented

- Adding collections
- Troubleshooting guide

## Recent Updates (2026-02-01)

**Phase 6 Complete - Theme System**:

- CSS variable theming with Tailwind v4
- Block-based content composition (6 block types)
- Two production themes: Default (blue) and Radical (red/black)
- Dark mode support (auto/light/dark)
- Seed script for quick setup (`pnpm seed:theme`)

**All Completed Phases**:

- ✅ Phase 1: Foundation (Payload CMS 3.62.0, Next.js 15.4.4)
- ✅ Phase 2: Data migration (N/A - clean slate)
- ✅ Phase 3: Core integrations (Square, ISBN lookup, CSV import)
- ✅ Phase 4: Sales system (cart, checkout, orders)
- ✅ Phase 5: Events system (registration, calendar, capacity)
- ✅ Phase 6: Theme system (CSS vars, blocks, dark mode)
- 📅 Phase 7: Public Storefront/CMS (next)

**Key Implementation Guides**:

- `task/theme-system.md` - Theme architecture documentation
- `task/theme-setup-guide.md` - Quick setup guide
- `task/phase-5-events-system.md` - Event registration system
- `task/phase-4-6-shopping-cart.md` - Shopping cart implementation
- `task/csv-bulk-import.md` - CSV import system

---

Last Updated: 2026-02-01
Project: Infoshop Payload CMS Migration
