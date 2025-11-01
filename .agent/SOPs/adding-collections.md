# SOP: Adding New Collections to Payload CMS

**Purpose**: Standard procedure for adding new data models (collections) to Infoshop Payload.

**When to Use**: Creating new data types like Products, Orders, Customers, etc.

---

## Prerequisites

- Dev server stopped or running with hot reload
- Understanding of the data model requirements
- Familiarity with TypeScript

---

## Step-by-Step Process

### 1. Create Collection Configuration File

Create a new file in `src/collections/`:

```bash
touch src/collections/YourCollection.ts
```

**Example**: Creating a `Reviews` collection

```typescript
// src/collections/Reviews.ts
import type { CollectionConfig } from 'payload'

export const Reviews: CollectionConfig = {
  slug: 'reviews',

  // Admin UI Configuration
  admin: {
    useAsTitle: 'title', // Field to display as document title
    defaultColumns: ['title', 'rating', 'book', 'createdAt'],
    group: 'Content', // Optional: group in admin sidebar
  },

  // Access Control
  access: {
    read: () => true, // Public read access
    create: ({ req: { user } }) => !!user, // Authenticated users can create
    update: ({ req: { user } }) => user?.role === 'admin', // Admin only
    delete: ({ req: { user } }) => user?.role === 'admin', // Admin only
  },

  // Fields
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 100,
    },
    {
      name: 'content',
      type: 'textarea',
      required: true,
    },
    {
      name: 'rating',
      type: 'number',
      required: true,
      min: 1,
      max: 5,
    },
    {
      name: 'book',
      type: 'relationship',
      relationTo: 'books', // Reference to Books collection
      required: true,
    },
    {
      name: 'reviewer',
      type: 'group',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
        },
        {
          name: 'email',
          type: 'email',
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Approved', value: 'approved' },
        { label: 'Rejected', value: 'rejected' },
      ],
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
    },
  ],

  // Timestamps (auto-added by default)
  timestamps: true,
}
```

### 2. Add Collection to Payload Config

Edit `src/payload.config.ts`:

```typescript
import { Reviews } from './collections/Reviews'

export default buildConfig({
  collections: [
    Users,
    Media,
    Books,
    Categories,
    Subjects,
    Suppliers,
    Events,
    Reviews, // Add your new collection
  ],
  // ...
})
```

### 3. Generate TypeScript Types

```bash
npm run generate:types
```

This creates/updates `src/payload-types.ts` with your new collection's types.

### 4. Verify Type Generation

Check `src/payload-types.ts` for your new interface:

```typescript
export interface Review {
  id: string
  title: string
  content: string
  rating: number
  book: string | Book
  // ...
}
```

### 5. Restart Dev Server (if running)

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### 6. Test in Admin UI

1. Navigate to `http://localhost:3000/admin`
2. Find your collection in the sidebar
3. Create a test document
4. Verify all fields work correctly

### 7. Test API Endpoints

```bash
# List all reviews
curl http://localhost:3000/api/reviews

# Get specific review
curl http://localhost:3000/api/reviews/:id

# Create review (requires authentication)
curl -X POST http://localhost:3000/api/reviews \
  -H "Authorization: JWT {token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "Great book!", "rating": 5, "content": "...", "book": "book_id"}'
```

---

## Common Field Types

### Text Fields

```typescript
{
  name: 'title',
  type: 'text',
  required: true,
  maxLength: 100,
  unique: true,  // Enforce uniqueness
}
```

### Rich Text

```typescript
{
  name: 'description',
  type: 'richText',
  required: true,
}
```

### Numbers

```typescript
{
  name: 'price',
  type: 'number',
  required: true,
  min: 0,
  max: 10000,
}
```

### Relationships (Single)

```typescript
{
  name: 'category',
  type: 'relationship',
  relationTo: 'categories',
  required: true,
}
```

### Relationships (Multiple)

```typescript
{
  name: 'tags',
  type: 'relationship',
  relationTo: 'subjects',
  hasMany: true,  // Allow multiple selections
}
```

### Arrays (Repeatable Fields)

```typescript
{
  name: 'features',
  type: 'array',
  fields: [
    {
      name: 'feature',
      type: 'text',
      required: true,
    },
  ],
}
```

### Groups (Nested Fields)

```typescript
{
  name: 'address',
  type: 'group',
  fields: [
    { name: 'street', type: 'text' },
    { name: 'city', type: 'text' },
    { name: 'postcode', type: 'text' },
  ],
}
```

### File Uploads

```typescript
{
  name: 'coverImage',
  type: 'upload',
  relationTo: 'media',
  required: false,
}
```

---

## Access Control Patterns

### Public Read, Authenticated Write

```typescript
access: {
  read: () => true,
  create: ({ req: { user } }) => !!user,
  update: ({ req: { user } }) => !!user,
  delete: ({ req: { user } }) => !!user,
}
```

### Admin Only

```typescript
access: {
  read: ({ req: { user } }) => user?.role === 'admin',
  create: ({ req: { user } }) => user?.role === 'admin',
  update: ({ req: { user } }) => user?.role === 'admin',
  delete: ({ req: { user } }) => user?.role === 'admin',
}
```

### Conditional Read (e.g., published content only for non-admins)

```typescript
access: {
  read: ({ req: { user } }) => {
    if (user?.role === 'admin') return true
    return { status: { equals: 'published' } }  // Query constraint
  },
}
```

---

## Hooks (Advanced)

Add lifecycle hooks for custom logic:

```typescript
export const Reviews: CollectionConfig = {
  // ...
  hooks: {
    beforeChange: [
      async ({ data, operation }) => {
        // Validate or transform data before saving
        if (operation === 'create') {
          data.status = 'pending' // Force pending status on creation
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation }) => {
        // Trigger actions after save
        if (operation === 'create') {
          // Send notification email
          console.log('New review created:', doc.id)
        }
      },
    ],
    beforeRead: [
      async ({ doc }) => {
        // Transform data before returning
        return doc
      },
    ],
  },
}
```

---

## Validation

Add custom validation:

```typescript
{
  name: 'rating',
  type: 'number',
  required: true,
  validate: (value) => {
    if (value < 1 || value > 5) {
      return 'Rating must be between 1 and 5'
    }
    return true
  },
}
```

---

## Troubleshooting

### Types Not Updating

```bash
# Delete generated types and regenerate
rm src/payload-types.ts
npm run generate:types
```

### Collection Not Appearing in Admin

- Check collection is exported in `src/payload.config.ts`
- Restart dev server
- Clear browser cache and reload

### API Endpoints Not Working

- Verify slug matches collection name
- Check access control allows the operation
- Ensure request has proper authentication headers (if required)

### Relationship Fields Not Populating

Use `depth` parameter:

```bash
GET /api/reviews/:id?depth=1
```

---

## Next Steps

- Add hooks for custom logic (see `.agent/system/key-components.md`)
- Customize admin UI components (see `SOPs/customizing-admin-ui.md`)
- Add custom endpoints (see `SOPs/adding-custom-endpoints.md`)

---

Last Updated: 2025-11-01
