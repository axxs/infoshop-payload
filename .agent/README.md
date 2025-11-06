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
│   ├── key-components.md
│   ├── dependencies.md
│   └── configuration.md
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

| File                      | What It Contains                                                 | When to Read                     |
| ------------------------- | ---------------------------------------------------------------- | -------------------------------- |
| `project-architecture.md` | Payload 3.x architecture, Next.js structure, collection patterns | Starting any feature             |
| `database-schema.md`      | Collection schemas, relationships, hooks                         | Working with data models         |
| `api-endpoints.md`        | REST/GraphQL APIs, custom endpoints                              | Building APIs                    |
| `key-components.md`       | Collection configs, hooks, plugins                               | Extending Payload                |
| `dependencies.md`         | Key packages and their purpose                                   | Debugging or adding dependencies |
| `configuration.md`        | payload.config.ts, environment variables                         | Configuration changes            |

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
- Collection schemas defined (including Phase 3.7 enhancements)
- API structure outlined
- Key components identified (including Open Library integration)

✅ **Task documentation**: Growing with each feature

- Phase 2: Database setup and initial collections
- Phase 3: Open Library ISBN lookup integration
- Phase 3.7: ISBN lookup enhancements (subjects, cover images)
- Phase 4.6: Shopping cart functionality
- CSV Bulk Import: Comprehensive book import system (2,467 lines)

✅ **SOPs**: Standard operating procedures documented

- Adding collections
- Troubleshooting guide

## Recent Updates (2025-11-06)

**CSV Bulk Import Documentation Added**:

- `task/csv-bulk-import.md` - Complete implementation guide (1,432 lines)
- Comprehensive CSV import system with two-phase workflow
- Validation engine with ERROR/WARNING/INFO severity levels
- Duplicate detection (ISBN + Title/Author) with 4 strategies
- Batch processing with configurable size (default 10)
- Admin UI modal component with preview and statistics
- Integration with Phase 3.7 infrastructure (subjects, cover images)
- 21 integration tests (all passing ✅)
- Total implementation: 2,467 lines

**Key Features Documented**:

- PapaParse CSV parsing with flexible column mapping
- 10+ validation rules (pricing, stock, ISBN, digital products)
- Find-or-create patterns for categories and subjects
- Optional ISBN enrichment from Open Library
- Secure cover image download with size limits
- Granular error reporting per row
- Preview before execute safety workflow

**Previous: Phase 3.7 Documentation**:

- `task/phase-3-7-isbn-enhancements.md` - Complete implementation guide (708 lines)
- Subject auto-creation with O(1) indexed lookups
- Secure cover image download with DoS prevention
- Hook context guards for recursion prevention
- Server actions for client integration
- 15 integration tests (all passing ✅)

---

Last Updated: 2025-11-06
Project: Infoshop Payload CMS Migration
