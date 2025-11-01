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

✅ **Initial system documentation created**

- Project architecture documented
- Collection schemas defined
- API structure outlined
- Key components identified

⏳ **Task documentation**: Will grow as features are built
⏳ **SOPs**: Will be added as processes are defined

---

Last Updated: 2025-11-01
Project: Infoshop Payload CMS Migration
