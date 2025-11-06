# Database Schema

## Overview

Payload CMS collections define the data schema. Drizzle ORM (used internally by Payload) manages the actual database tables.

## Current Collections (7 total)

### Users

**Purpose**: Authentication and authorization

**Key Fields**:

- `email` (unique, required)
- `password` (hashed)
- `name` (optional)
- `roles` (admin, user, etc.)

**Auth**: Built-in Payload auth with JWT

**Location**: `src/collections/Users.ts`

---

### Media

**Purpose**: File uploads (images, documents)

**Key Fields**:

- `filename`
- `mimeType`
- `filesize`
- `width`, `height` (for images)
- `url` (auto-generated)

**Storage**: Local filesystem (configurable for S3/cloud)

**Location**: `src/collections/Media.ts`

---

### Books

**Purpose**: Book inventory management

**Key Fields**:

- `title` (required)
- `isbn` (unique identifier)
- `upc` (barcode)
- `authors` (text field)
- `publisher`
- `publicationYear`
- `language`
- `bindingType`
- `pages`
- `dimensions` (width, height, depth)
- **Pricing**:
  - `costPrice` (wholesale cost)
  - `memberPrice` (member discount price)
  - `sellPrice` (retail price)
- **Stock**:
  - `quantityInStock`
  - `lowStockThreshold`
- **Relationships**:
  - `category` → Categories (has one)
  - `subjects` → Subjects (has many)
  - `supplier` → Suppliers (has one)
- `description` (rich text)
- `coverImage` → Media (has one)
- `_subjectNames` (hidden, temporary) - Staging field for ISBN lookup subject processing

**Validation**: Cost < Member < Sell pricing

**Hooks**: `validateStock`, `validatePricing`, `validateISBNFormat`, `calculateStockStatus`, `validateDigitalProduct`, `checkLowStock`, `processSubjectsFromISBN`

**Location**: `src/collections/Books.ts`

---

### Categories

**Purpose**: Book categorisation (hierarchical)

**Key Fields**:

- `name` (required, unique)
- `slug` (auto-generated)
- `description`
- `parent` → Categories (self-referencing for hierarchy)

**Usage**: Single category per book

**Location**: `src/collections/Categories.ts`

---

### Subjects

**Purpose**: Subject matter tags (flat structure)

**Key Fields**:

- `name` (required, unique)
- `slug` (auto-generated)
- `normalizedName` (required, indexed, auto-generated) - For O(1) case-insensitive lookups
- `description` (optional)

**Performance**: Indexed `normalizedName` field enables efficient case-insensitive searches

**Usage**: Multiple subjects per book

**Location**: `src/collections/Subjects.ts`

---

### Suppliers

**Purpose**: Vendor/distributor management

**Key Fields**:

- `name` (required)
- `code` (unique identifier)
- `contactPerson`
- `email`
- `phone`
- `address` (group: street, city, postcode, country)
- `website`
- `notes`

**Location**: `src/collections/Suppliers.ts`

---

### Events

**Purpose**: Store events and workshops

**Key Fields**:

- `title` (required)
- `slug` (auto-generated)
- `description` (rich text)
- `startDate`, `endDate`
- `location`
- `capacity` (max attendees)
- `registered` (current count - future feature)
- `image` → Media (has one)
- `status` (draft, published)

**Location**: `src/collections/Events.ts`

---

## Relationships

```
Books ──has-one──→ Category
Books ──has-many──→ Subjects
Books ──has-one──→ Supplier
Books ──has-one──→ Media (coverImage)

Events ──has-one──→ Media (image)

Categories ──has-one──→ Categories (parent, for hierarchy)
```

## Database Technology

**Current**: SQLite (file: `infoshop.db`)

- Suitable for development
- No server required
- Easy backup (copy file)

**Production**: PostgreSQL (planned)

- Better performance under load
- Proper concurrent access
- Full ACID compliance

**Migration Path**: Payload supports switching adapters

## Access Patterns

### Public Access

- Read books, categories, subjects
- Read published events
- View supplier info (limited fields)

### Authenticated Users

- Full CRUD on all collections (role-dependent)
- Media uploads
- Event registration (future feature)

### Admin Only

- User management
- Supplier full details
- System configuration

## Hooks

### Books Collection (Implemented)

- **beforeChange**: `validateStock` - Ensure stock quantity never negative
- **beforeChange**: `validatePricing` - Validate pricing hierarchy (cost < member < sell)
- **beforeChange**: `validateISBNFormat` - Validate ISBN-10 or ISBN-13 format
- **beforeChange**: `calculateStockStatus` - Auto-update stock status based on quantity
- **beforeChange**: `validateDigitalProduct` - Ensure digital products don't track inventory
- **afterChange**: `checkLowStock` - Log warnings for low stock items
- **afterChange**: `processSubjectsFromISBN` - Process staged subjects from ISBN lookup

### Future Hooks

- **afterChange**: Sync with Square POS (planned)
- **beforeRead**: Apply member pricing if applicable (planned)

### Events Collection (Planned)

- **beforeChange**: Validate capacity
- **afterChange**: Update attendee count
- **afterRead**: Calculate status (past/upcoming)

## Auto-Generated Types

TypeScript types are auto-generated in `src/payload-types.ts`:

```typescript
export interface Book {
  id: string
  title: string
  isbn?: string
  // ... all fields typed
  category?: string | Category
  subjects?: (string | Subject)[]
  // ...
}
```

Regenerate with: `npm run generate:types`

## Query Examples

### REST API

```bash
# Get all books
GET /api/books

# Get book by ID
GET /api/books/:id

# Query with filters
GET /api/books?where[category][equals]=fiction&limit=10

# Populate relationships
GET /api/books/:id?depth=1
```

### GraphQL

```graphql
query {
  Books(limit: 10, where: { category: { equals: "fiction" } }) {
    docs {
      title
      isbn
      category {
        name
      }
      subjects {
        name
      }
    }
  }
}
```

## Migration Notes

Data will be migrated from Prisma schema in Phase 2:

- Export from `/home/axxs/infoshop` PostgreSQL
- Transform to Payload format
- Import to Payload SQLite/PostgreSQL
- Validate relationships

---

Last Updated: 2025-11-01
