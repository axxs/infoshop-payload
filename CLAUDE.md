# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Payload is a monorepo structured around Next.js, containing the core CMS platform, database adapters, plugins, and tooling.

### Key Directories

- `packages/` - All publishable packages
  - `packages/payload` - Core Payload package containing the main CMS logic
  - `packages/ui` - Admin UI components (React Server Components)
  - `packages/next` - Next.js integration layer
  - `packages/db-*` - Database adapters (MongoDB, Postgres, SQLite, Vercel Postgres, D1 SQLite)
  - `packages/drizzle` - Drizzle ORM integration
  - `packages/richtext-*` - Rich text editors (Lexical, Slate)
  - `packages/storage-*` - Storage adapters (S3, Azure, GCS, Uploadthing, Vercel Blob)
  - `packages/email-*` - Email adapters (Nodemailer, Resend)
  - `packages/plugin-*` - Additional functionality plugins
  - `packages/graphql` - GraphQL API layer
  - `packages/translations` - i18n translations
- `test/` - Test suites organized by feature area. Each directory contains a granular Payload config and test files
- `docs/` - Documentation (deployed to payloadcms.com)
- `tools/` - Monorepo tooling
- `templates/` - Production-ready project templates
- `examples/` - Example implementations

### Architecture Notes

- Payload 3.x is built as a Next.js native CMS that installs directly in `/app` folder
- UI is built with React Server Components (RSC)
- Database adapters use Drizzle ORM under the hood
- Packages use TypeScript with strict mode and path mappings defined in `tsconfig.base.json`
- Source files are in `src/`, compiled outputs go to `dist/`
- Monorepo uses pnpm workspaces and Turbo for builds

## Build Commands

- `pnpm install` - Install all dependencies (pnpm required - run `corepack enable` first)
- `pnpm build` or `pnpm build:core` - Build core packages (excludes plugins and storage adapters)
- `pnpm build:all` - Build all packages
- `pnpm build:<directory_name>` - Build specific package (e.g. `pnpm build:db-mongodb`, `pnpm build:ui`)

## Development

### Running Dev Server

- `pnpm dev` - Start dev server with default config (`test/_community/config.ts`)
- `pnpm dev <directory_name>` - Start dev server with specific test config (e.g. `pnpm dev fields` loads `test/fields/config.ts`)
- `pnpm dev:postgres` - Run dev server with Postgres
- `pnpm dev:memorydb` - Run dev server with in-memory MongoDB

### Development Environment

- Auto-login is enabled by default with credentials: `dev@payloadcms.com` / `test`
- To disable: pass `--no-auto-login` flag or set `PAYLOAD_PUBLIC_DISABLE_AUTO_LOGIN=false`
- Default database is MongoDB (in-memory). Switch to Postgres with `PAYLOAD_DATABASE=postgres`
- Docker services: `pnpm docker:start` / `pnpm docker:stop` / `pnpm docker:restart`

## Testing

### Running Tests

- `pnpm test` - Run all tests (integration + components + e2e)
- `pnpm test:int` - Run integration tests (MongoDB, recommended for verifying local changes)
- `pnpm test:int <directory_name>` - Run specific integration test suite (e.g. `pnpm test:int fields`)
- `pnpm test:int:postgres` - Run integration tests with Postgres
- `pnpm test:int:sqlite` - Run integration tests with SQLite
- `pnpm test:unit` - Run unit tests
- `pnpm test:e2e` - Run end-to-end tests (Playwright)
- `pnpm test:e2e:headed` - Run e2e tests in headed mode
- `pnpm test:e2e:debug` - Run e2e tests in debug mode
- `pnpm test:components` - Run component tests (Jest)
- `pnpm test:types` - Run type tests (tstyche)

### Test Structure

Each test directory in `test/` follows this pattern:

```
test/<feature-name>/
├── config.ts        # Lightweight Payload config for testing
├── int.spec.ts      # Integration tests (Jest)
├── e2e.spec.ts      # End-to-end tests (Playwright)
└── payload-types.ts # Generated types
```

Generate types for a test directory: `pnpm dev:generate-types <directory_name>`

## Linting & Formatting

- `pnpm lint` - Run linter across all packages
- `pnpm lint:fix` - Fix linting issues

## Internationalization

- Translation files are in `packages/translations/src/languages/`
- Add new strings to English locale first, then translate to other languages
- Run `pnpm translateNewKeys` to auto-translate new keys (requires `OPENAI_KEY` in `.env`)
- Lexical translations: `cd packages/richtext-lexical && pnpm translateNewKeys`

## Commit & PR Guidelines

This repository follows [Conventional Commits](https://www.conventionalcommits.org/).

### PR Title Format

`<type>(<scope>): <title>`

- Title must start with lowercase letter
- Types: `build`, `chore`, `ci`, `docs`, `examples`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `templates`, `test`
- Prefer `feat` for new features, `fix` for bug fixes
- Scopes match package names: `db-*`, `richtext-*`, `storage-*`, `plugin-*`, `ui`, `next`, `graphql`, `translations`, etc.
- Choose most relevant scope if multiple packages modified, or omit scope entirely

Examples:

- `feat(db-mongodb): add support for transactions`
- `feat(richtext-lexical): add options to hide block handles`
- `fix(ui): json field type ignoring editorOptions`
- `feat: add new collection functionality`

### Commit Guidelines

- First commit of branch should follow PR title format
- Subsequent commits should use `chore` without scope unless specific package is being modified
- All commits in a PR are squashed on merge using PR title as commit message

## Additional Resources

- LLMS.txt: <https://payloadcms.com/llms.txt>
- LLMS-FULL.txt: <https://payloadcms.com/llms-full.txt>
- Node version: ^18.20.2 || >=20.9.0
- pnpm version: ^9.7.0

---

# Development Partnership & Quality Standards

We're building production-quality code together. Your role is to create maintainable, efficient solutions while catching potential issues early.

## 🚨 AUTOMATED CHECKS ARE MANDATORY

**ALL hook issues are BLOCKING - EVERYTHING must be ✅ GREEN!**
No errors. No formatting issues. No linting problems. Zero tolerance.
These are not suggestions. Fix ALL issues before continuing.

When hooks report ANY issues (exit code 2), you MUST:

1. **STOP IMMEDIATELY** - Do not continue with other tasks
2. **FIX ALL ISSUES** - Address every ❌ issue until everything is ✅ GREEN
3. **VERIFY THE FIX** - Re-run the failed command to confirm it's fixed
4. **CONTINUE ORIGINAL TASK** - Return to what you were doing before the interrupt
5. **NEVER IGNORE** - There are NO warnings, only requirements

## .agent Documentation System

**Before starting ANY feature, read the .agent documentation for context.**

This project uses the `.agent/` documentation system to optimize context and reduce token consumption. The system provides focused, summarized documentation about the codebase.

### Before Starting Features

1. **Read `.agent/README.md`** - Documentation index and usage guide
2. **Check relevant system docs**:
   - `.agent/system/project-architecture.md` - Payload architecture patterns
   - `.agent/system/database-schema.md` - Collections, Drizzle schemas
   - `.agent/system/api-endpoints.md` - REST/GraphQL API contracts
   - `.agent/system/key-components.md` - Collection configs, hooks, plugins
3. **Look for similar implementations** in `.agent/task/`
4. **Review relevant SOPs** in `.agent/SOPs/`

### After Completing Features

1. **Update documentation**: Run `/update-doc` to refresh system docs
2. **Save implementation**: Run `/update-doc task <feature-name>` to document your approach
3. **Create SOPs**: Run `/update-doc sop <process-name>` for repeatable processes

### Benefits

- **Token Savings**: 30-50% reduction for similar features
- **Faster Context**: Find patterns without grepping entire codebase
- **Cumulative Knowledge**: Each feature makes future work easier

## CRITICAL WORKFLOW - ALWAYS FOLLOW THIS!

### Research → Plan → Implement

**NEVER JUMP STRAIGHT TO CODING!** Always follow this sequence:

1. **Research**: Read `.agent/` docs, explore codebase, understand existing patterns
2. **Plan**: Create a detailed implementation plan and verify it with user
3. **Implement**: Execute the plan with validation checkpoints

When asked to implement any feature, first say: "Let me research the codebase and create a plan before implementing."

### USE MULTIPLE AGENTS!

Leverage subagents aggressively for better results:

- Spawn agents to explore different parts of the codebase in parallel
- Use one agent to write tests while another implements features
- Delegate research tasks
- For complex refactors: One agent identifies changes, another implements them

### Reality Checkpoints

**Stop and validate** at these moments:

- After implementing a complete feature
- Before starting a new major component
- When something feels wrong
- Before declaring "done"
- **WHEN HOOKS FAIL WITH ERRORS** ❌

Run: `pnpm lint && pnpm test`

> Why: You can lose track of what's actually working. These checkpoints prevent cascading failures.

## TypeScript-Specific Rules

### FORBIDDEN - NEVER DO THESE:

- **NO any type** - use specific types or generics!
- **NO console.log()** in production code - use proper logging!
- **NO synchronous file operations** - use async/await!
- **NO** keeping old and new code together
- **NO** migration functions or compatibility layers
- **NO** versioned function names (processV2, handleNew)
- **NO** deeply nested callbacks - use async/await
- **NO** TODOs in final code

> **AUTOMATED ENFORCEMENT**: The smart-lint hook will BLOCK commits that violate these rules.
> When you see `❌ FORBIDDEN PATTERN`, you MUST fix it immediately!

### Required Standards:

- **Delete** old code when replacing it
- **Meaningful names**: `userId` not `id`
- **Early returns** to reduce nesting
- **Strict types**: `function createServer(): Server`
- **Proper error handling**: Use try/catch or Result types
- **Test all edge cases** with Vitest/Jest
- **Async/await for async operations**: No callback hell
- **Proper timeouts**: Use Promise.race() or AbortController

## Implementation Standards

### Code is complete when:

- ✅ All linters pass with zero issues
- ✅ All tests pass (unit, integration, e2e)
- ✅ Feature works end-to-end
- ✅ Old code is deleted
- ✅ JSDoc/TSDoc on all exported symbols

### Testing Strategy

- Complex business logic → Write tests first (TDD)
- Simple CRUD → Write tests after
- Hot paths → Add performance tests
- Test all public APIs and edge cases
- Follow Payload test structure (int.spec.ts, e2e.spec.ts)

## Working Memory Management

### When context gets long:

- Re-read this CLAUDE.md file
- Summarise progress in a PROGRESS.md file
- Document current state before major changes

### Maintain TODO.md:

```
## Current Task
- [ ] What we're doing RIGHT NOW

## Completed
- [x] What's actually done and tested

## Next Steps
- [ ] What comes next
```

## Problem-Solving Together

When you're stuck or confused:

1. **Stop** - Don't spiral into complex solutions
2. **Delegate** - Consider spawning agents for parallel investigation
3. **Step back** - Re-read the requirements
4. **Simplify** - The simple solution is usually correct
5. **Ask** - "I see two approaches: [A] vs [B]. Which do you prefer?"

## Performance & Security

### Measure First:

- No premature optimisation
- Profile before claiming something is faster
- Use Chrome DevTools or Node.js profiler for bottlenecks

### Security Always:

- Validate all inputs
- Use crypto.randomBytes() for randomness
- Parameterised queries (Drizzle handles this)
- Sanitise user input for XSS prevention

## Working Together

- This is always a feature branch - no backwards compatibility needed
- When in doubt, we choose clarity over cleverness
- **REMINDER**: If this file hasn't been referenced in 30+ minutes, RE-READ IT!

Avoid complex abstractions or "clever" code. The simple, obvious solution is probably better.
