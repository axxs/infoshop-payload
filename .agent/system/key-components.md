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

### Implemented Hooks (Phase 3.7)

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

### Hook Example

```typescript
const validatePricing = async ({ data, operation }) => {
  if (operation === 'create' || operation === 'update') {
    const { costPrice, memberPrice, sellPrice } = data
    if (costPrice >= memberPrice || memberPrice >= sellPrice) {
      throw new Error('Invalid pricing: cost < member < sell required')
    }
  }
  return data
}
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

## Admin UI Customisation

### Default Columns

```typescript
admin: {
  defaultColumns: ['title', 'category', 'sellPrice', 'quantityInStock'],
}
```

### Use as Title

```typescript
admin: {
  useAsTitle: 'title',  // Field to display as document title
}
```

### Custom Components

**ISBN Lookup Field** (`src/collections/Books/ISBNLookupField.tsx`):

Custom field component with progressive feedback and auto-population:

```typescript
import { TextInput, useField, useForm, Button } from '@payloadcms/ui'
import { downloadBookCover } from '@/lib/openLibrary/actions'

export const ISBNLookupField = ({ path }: ISBNLookupFieldProps) => {
  const { value, setValue } = useField<string>({ path })
  const { dispatchFields } = useForm()

  const handleLookup = async () => {
    // Fetch book data from Open Library API
    const response = await fetch(`/api/books/lookup-isbn?isbn=${value}`)
    const result = await response.json()

    // Auto-populate fields
    dispatchFields({ type: 'UPDATE', path: 'title', value: result.data.title })

    // Download cover image
    const coverResult = await downloadBookCover(coverImageUrl, bookTitle)
    dispatchFields({ type: 'UPDATE', path: 'coverImage', value: coverResult.mediaId })

    // Stage subjects for hook processing
    dispatchFields({ type: 'UPDATE', path: '_subjectNames', value: result.data.subjects })
  }

  return (
    <div>
      <TextInput path={path} value={value} onChange={(e) => setValue(e.target.value)} />
      <Button onClick={handleLookup}>Look up Book</Button>
    </div>
  )
}
```

**Usage in Collection Config**:

```typescript
{
  name: 'isbn',
  type: 'text',
  admin: {
    components: {
      Field: '@/collections/Books/ISBNLookupField#ISBNLookupField',
    },
  },
}
```

## Payload Config

Main configuration: `src/payload.config.ts`

```typescript
import { buildConfig } from 'payload'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Books, Categories, Subjects, Suppliers, Events],
  editor: lexicalEditor(),
  db: sqliteAdapter({
    client: { url: process.env.DATABASE_URI! },
  }),
  secret: process.env.PAYLOAD_SECRET!,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
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

Payload runs as Next.js middleware:

```typescript
// src/app/(payload)/api/[...slug]/route.ts
import { REST_GET, REST_POST, REST_DELETE, REST_PATCH } from '@payloadcms/next/routes'

export const GET = REST_GET
export const POST = REST_POST
export const DELETE = REST_DELETE
export const PATCH = REST_PATCH
```

## Plugins

Current plugins:

- `payloadCloudPlugin` - Cloud deployment support

Future plugins:

- Custom Square sync plugin (Phase 3 planned)
- Bulk import plugin (Phase 4.x planned)

## Open Library Integration (Phase 3.7)

### Subject Manager (`src/lib/openLibrary/subjectManager.ts`)

**Purpose**: Find-or-create Subject records with performance optimization and race condition handling.

**Key Functions**:

```typescript
// Find or create subject with O(1) indexed lookups
export async function findOrCreateSubject(payload: Payload, name: string): Promise<SubjectResult>

// Process multiple subjects with filtering and limits
export async function processSubjects(
  payload: Payload,
  subjectNames: string[],
  options?: SubjectManagerOptions,
): Promise<number[]>

// Link subjects to a book with validation
export async function linkSubjectsToBook(
  payload: Payload,
  bookId: number,
  subjectIds: number[],
): Promise<void>

// Complete workflow: process and link subjects
export async function processAndLinkSubjects(
  payload: Payload,
  bookId: number,
  subjectNames: string[],
  options?: SubjectManagerOptions,
): Promise<number>
```

**Features**:

- O(1) case-insensitive lookups using indexed `normalizedName` field
- Generic subject filtering (skips "Fiction", "Literature", etc.)
- Race condition handling with duplicate error retry
- Configurable max subjects and filtering options

### Image Downloader (`src/lib/openLibrary/imageDownloader.ts`)

**Purpose**: Secure cover image download and storage.

**Key Functions**:

```typescript
// Download image with validation and return actual content-type
async function downloadImageBuffer(
  url: string,
  timeout?: number,
): Promise<{ buffer: Buffer; contentType: string }>

// Download and create Media record
export async function downloadCoverImage(
  payload: Payload,
  imageUrl: string,
  options?: DownloadImageOptions,
): Promise<DownloadImageResult>
```

**Security Features**:

- HTTPS-only enforcement
- 10MB size limit with pre/post-download validation
- Content-Type validation
- 30-second timeout with AbortController
- DoS prevention

### Server Actions (`src/lib/openLibrary/actions.ts`)

**Purpose**: `'use server'` functions for client component integration.

```typescript
// Process subjects and link to book
export async function processBookSubjects(
  bookId: number,
  subjectNames: string[],
): Promise<ProcessSubjectsResult>

// Download cover image and return Media ID
export async function downloadBookCover(
  coverImageUrl: string | undefined,
  bookTitle: string,
): Promise<DownloadCoverResult>
```

---

Last Updated: 2025-11-06
