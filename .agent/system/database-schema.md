# Database Schema

## Overview

Payload CMS collections define the data schema. Drizzle ORM (used internally by Payload) manages the actual database tables.

## Current Collections (10 total) + 2 Globals

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

### EventAttendance

**Purpose**: Event registration and attendance tracking

**Key Fields**:

- `event` → Events (required, relationship)
- `user` → Users (required, relationship)
- `status` (REGISTERED, ATTENDED, CANCELLED, WAITLIST)
- `registeredAt` (auto-set timestamp)
- `attendedAt` (set when checked in)
- `cancelledAt` (set when cancelled)
- `cancellationReason` (optional)
- `notes` (internal notes)

**Hooks**: `preventDuplicateRegistration`, `validateCapacityAndSetStatus`, `setTimestamps`, `updateEventAttendeeCount`

**Location**: `src/collections/EventAttendance.ts`

---

### Sales

**Purpose**: Point of sale transactions and online orders

**Key Fields**:

- `receiptNumber` (unique, auto-generated)
- `saleDate` (date/time of sale)
- `status` (PENDING, PROCESSING, COMPLETED, CANCELLED, REFUNDED)
- `statusHistory` (audit trail array)
- `totalAmount` (calculated from items)
- `paymentMethod` (CASH, CARD, SQUARE, MEMBER_CREDIT, OTHER)
- **Square Integration**:
  - `squareTransactionId`
  - `squareReceiptUrl`
- **Customer Info**:
  - `customer` → Users (optional relationship)
  - `customerEmail`
  - `customerName`
- `items` → SaleItems (has many, required)
- **Cancellation**:
  - `cancelledAt`, `cancelledBy`, `cancellationReason`
- `notes`

**Hooks**: `validateSaleItems`, `generateReceiptNumber`, `calculateTotalAmount`, `deductStock`

**Location**: `src/collections/Sales.ts`

---

### SaleItems

**Purpose**: Individual line items for sales

**Key Fields**:

- `book` → Books (required relationship)
- `quantity` (min: 1)
- `unitPrice` (price at time of sale)
- `discount` (optional discount amount)
- `lineTotal` (calculated: quantity × unitPrice - discount)
- `priceType` (RETAIL, MEMBER, CUSTOM)

**Admin**: Hidden from navigation (accessed via Sales)

**Hooks**: `validateStockAvailability`, `setUnitPriceFromBook`, `calculateLineTotal`

**Location**: `src/collections/SaleItems.ts`

---

## Globals (2 total)

### Theme

**Purpose**: Site-wide theming configuration with live preview

**Key Fields**:

- `activeTheme` (default, radical)
- `colorMode` (auto, light, dark)
- **Per-theme color settings** (light/dark modes):
  - primary, background, foreground, card, muted, accent, destructive, border, input, ring, popover, secondary
- **Typography**: fontFamily, headingFontFamily, radius

**Features**: Live preview, draft/publish versioning

**Location**: `src/globals/Theme.ts`

---

### Layout

**Purpose**: Site header, footer, and homepage configuration

**Key Fields**:

- **Header**:
  - `logo` → Media
  - `navigation` (array with nested children for dropdowns)
  - `ctaButton` (label, href)
- **Footer**:
  - `columns` (array of link groups)
  - `socialLinks` (platform, url)
  - `copyright`
- **Homepage**:
  - `blocks` (block-based page builder)

**Features**: Live preview, draft/publish versioning

**Location**: `src/globals/Layout.ts`

---

## Relationships

```
Books ──has-one──→ Category
Books ──has-many──→ Subjects
Books ──has-one──→ Supplier
Books ──has-one──→ Media (coverImage)

Events ──has-one──→ Media (image)
EventAttendance ──has-one──→ Events
EventAttendance ──has-one──→ Users

Sales ──has-many──→ SaleItems
Sales ──has-one──→ Users (customer, optional)
SaleItems ──has-one──→ Books

Categories ──has-one──→ Categories (parent, for hierarchy)

Layout ──has-one──→ Media (logo)
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

### Sales Collection (Implemented)

- **beforeValidate**: `validateSaleItems` - Ensure items exist and are valid
- **beforeChange**: `generateReceiptNumber` - Auto-generate unique receipt numbers
- **beforeChange**: `calculateTotalAmount` - Sum line items for total
- **afterChange**: `deductStock` - Reduce book inventory on completed sales

### SaleItems Collection (Implemented)

- **beforeValidate**: `validateStockAvailability` - Check sufficient stock
- **beforeChange**: `setUnitPriceFromBook` - Copy current book price
- **beforeChange**: `calculateLineTotal` - Calculate quantity × price - discount

### EventAttendance Collection (Implemented)

- **beforeValidate**: `preventDuplicateRegistration` - One registration per user per event
- **beforeValidate**: `validateCapacityAndSetStatus` - Check capacity, set waitlist if full
- **beforeChange**: `setTimestamps` - Auto-set registeredAt, attendedAt, cancelledAt
- **afterChange**: `updateEventAttendeeCount` - Update event's registered count

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

Last Updated: 2025-02-01
