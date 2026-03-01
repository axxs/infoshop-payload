# Key Components

## Collection Configs

Location: `src/collections/`

Each collection is defined by a TypeScript config file exporting a `CollectionConfig` object.

### Example Structure

```typescript
import type { CollectionConfig } from 'payload'

export const Books: CollectionConfig = {
  slug: 'books',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'isbn', 'category'],
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => !!user,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'isbn', type: 'text', unique: true },
    // ... more fields
  ],
  hooks: {
    beforeChange: [validatePricing],
  },
}
```

## Hooks

Hooks allow custom logic at lifecycle points:

### Available Hooks

- `beforeOperation` - Before any operation
- `beforeValidate` - Before validation
- `beforeChange` - Before save
- `afterChange` - After save
- `beforeRead` - Before data returned
- `afterRead` - After data fetched
- `beforeDelete` - Before deletion
- `afterDelete` - After deletion

### Implemented Hooks

**Users Collection** (`src/collections/Users.ts`):

```typescript
// Prevents role escalation on self-registration
export const enforceCustomerOnSelfRegistration: CollectionBeforeChangeHook
```

**Books Collection** (`src/collections/Books/hooks.ts`):

```typescript
// Validation hooks
export const validateStock: CollectionBeforeChangeHook
export const validatePricing: CollectionBeforeChangeHook
export const validateISBNFormat: CollectionBeforeChangeHook
export const validateDigitalProduct: CollectionBeforeChangeHook

// Auto-calculation hooks
export const calculateStockStatus: CollectionBeforeChangeHook

// Notification hooks
export const checkLowStock: CollectionAfterChangeHook

// ISBN lookup integration
export const processSubjectsFromISBN: CollectionAfterChangeHook
```

**Inquiries Collection** (`src/collections/Inquiries.ts`):

```typescript
// Blocks inquiry creation when payments are enabled
export const enforcePaymentsDisabled: CollectionBeforeChangeHook
```

**StoreSettings Global** (`src/globals/StoreSettings.ts`):

```typescript
// Invalidates Next.js cache when settings change
export const invalidateSettingsCache: GlobalAfterChangeHook
```

### Recursion Prevention Pattern

When hooks perform updates, use context guards to prevent infinite loops:

```typescript
export const processSubjectsFromISBN: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
  context,
}) => {
  // CRITICAL: Skip if this update is from our cleanup operation
  if (context?.skipSubjectProcessing) {
    return doc
  }

  // Process subjects...

  // Clear temporary field with recursion guard
  await req.payload.update({
    collection: 'books',
    id: doc.id,
    data: { _subjectNames: null },
    context: { skipSubjectProcessing: true }, // Prevents infinite loop
  })

  return doc
}
```

## Access Control

### Collection-Level

Function-based permissions:

```typescript
access: {
  read: ({ req: { user } }) => {
    if (!user) return { published: { equals: true } }
    return true
  },
  create: ({ req: { user } }) => !!user,
  update: ({ req: { user } }) => user?.role === 'admin',
  delete: ({ req: { user } }) => user?.role === 'admin',
}
```

### Field-Level

```typescript
import { adminFieldAccess } from '@/lib/access'

{
  name: 'isMember',
  type: 'checkbox',
  access: {
    create: adminFieldAccess,
    update: adminFieldAccess,
  },
}
```

### Access Utilities (`src/lib/access.ts`)

- `isAdmin` — checks `user.role === 'admin'`
- `isAdminOrVolunteer` — checks admin or volunteer role
- `isAuthenticated` — checks user exists
- `publicRead` — always returns true
- `adminFieldAccess` — field-level admin-only guard

## Auth System

### Server Actions (`src/lib/auth/actions.ts`)

```typescript
// Registration with Zod validation and IP rate limiting
export async function registerUser(formData: FormData): Promise<AuthActionResult>

// Login with Zod validation
export async function loginUser(formData: FormData): Promise<AuthActionResult>

// Logout (deletes cookie)
export async function logoutUser(): Promise<void>
```

### Server Utilities

```typescript
// src/lib/auth/getCurrentUser.ts — NOT a server action
export async function getCurrentUser(): Promise<User | null>

// src/lib/auth/sanitizeRedirect.ts — open redirect prevention
export function sanitizeRedirect(url: string | undefined, fallback = '/account'): string
```

### Auth Pages

- `/login` — Login form with redirect support (`?redirect=/checkout`)
- `/register` — Registration with confirm password, auto-login on success
- `/account` — Landing page with orders/events links, logout button

## Field Types

Common field types used:

- `text` - Single-line text
- `textarea` - Multi-line text
- `richText` - Rich text editor (Lexical)
- `number` - Numeric values
- `email` - Email addresses
- `date` - Date/time
- `checkbox` - Boolean
- `select` - Dropdown
- `relationship` - Link to other collections
- `upload` - File upload (links to Media)
- `group` - Group related fields
- `array` - Repeatable fields
- `ui` - Custom UI-only component (e.g., SquareConfigStatus)

## Admin UI Customisation

### Custom Components

**ISBN Lookup Field** (`src/collections/Books/ISBNLookupField.tsx`):

Custom field component with progressive feedback and auto-population.

**Square Config Status** (`src/globals/components/SquareConfigStatus.tsx`):

UI field showing Square environment variable configuration status.

## Payload Config

Main configuration: `src/payload.config.ts`

```typescript
import { buildConfig } from 'payload'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: { titleSuffix: '- Infoshop' },
  },
  collections: [
    Users, Media, Books, Categories, Subjects, Suppliers,
    Events, EventAttendance, Sales, SaleItems,
    ContactSubmissions, Inquiries,
  ],
  globals: [Theme, Layout, StoreSettings],
  editor: lexicalEditor(),
  // Auto-detects PostgreSQL vs SQLite from DATABASE_URI
  db: postgresAdapter(...) || sqliteAdapter(...),
  sharp,
  plugins: [payloadCloudPlugin()],
})
```

## Type Generation

Types auto-generate from collection configs:

```typescript
// src/payload-types.ts (auto-generated)
export interface Book {
  id: string
  title: string
  isbn?: string
  category?: string | Category
  subjects?: (string | Subject)[]
  // ...
}
```

Regenerate: `npm run generate:types`

## Next.js Integration

### Server Components + Server Actions Pattern

Frontend uses Next.js App Router with:
- Server components for data fetching (e.g., checking auth state)
- Client components for interactive forms (e.g., LoginForm, RegisterForm)
- Server Actions for mutations (e.g., auth, contact, checkout)

### Key Libraries

- `src/lib/auth/` — Authentication actions and utilities
- `src/lib/checkout/` — Cart management, checkout processing
- `src/lib/contact/` — Contact form submission
- `src/lib/square/` — Square payment integration
- `src/lib/bookLookup/` — Multi-source ISBN lookup
- `src/lib/csv/` — CSV import processing
- `src/lib/rateLimit.ts` — IP-based rate limiting utility

## Plugins

Current plugins:

- `payloadCloudPlugin` - Cloud deployment support

Implemented integrations (custom code, not plugins):

- Square POS sync (`src/lib/square/`)
- CSV bulk import (`src/lib/csv/`)
- Multi-source book lookup (`src/lib/bookLookup/`)
- Auth system (`src/lib/auth/`)
- Contact form (`src/lib/contact/`)

---

Last Updated: 2026-03-01
