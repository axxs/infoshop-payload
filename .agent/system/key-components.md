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

### Custom Components (Planned for Phase 3)

```typescript
admin: {
  components: {
    views: {
      Edit: {
        actions: [CustomLookupButton],
      },
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

Future plugins (Phase 3):

- Custom Square sync plugin
- Book lookup plugin
- Bulk import plugin

---

Last Updated: 2025-11-01
