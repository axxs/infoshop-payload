# Database Schema

## Overview

Payload CMS collections define the data schema. Drizzle ORM (used internally by Payload) manages the actual database tables.

## Current Collections (12 total) + 3 Globals

### Users

**Purpose**: Authentication and authorization

**Key Fields**:

- `email` (unique, required)
- `password` (hashed)
- `name` (optional)
- `role` (select: admin, volunteer, customer — default: customer)
- `isMember` (checkbox — grants member pricing, admin-only field)
- `membershipNumber` (text, admin-only)
- `memberSince` (date, admin-only)

**Auth**: Built-in Payload auth with JWT, `maxLoginAttempts: 10`, 15-minute lockout

**Access**:

- `create: () => true` — public self-registration
- `read`: authenticated users only
- `update`: admins can update any user, users can update themselves
- `delete`: admin only
- Field-level: `role` (create), `isMember`, `membershipNumber`, `memberSince` — admin only via `adminFieldAccess`

**Hooks**: `enforceCustomerOnSelfRegistration` — forces `role: 'customer'` and strips membership fields on non-admin create requests

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
- `registered` (current count)
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

### ContactSubmissions

**Purpose**: Contact form submissions from the public website

**Key Fields**:

- `name` (required, max 200)
- `email` (required)
- `message` (required, max 5000)
- `status` (select: new, read, replied — default: new)

**Access**: Public create, admin/volunteer read/update/delete

**Location**: `src/collections/ContactSubmissions.ts`

---

### Inquiries

**Purpose**: Book purchase inquiries submitted when online payments are disabled

**Key Fields**:

- `customerName` (required, max 200)
- `customerEmail` (required)
- `message` (optional, max 2000)
- `items` (array, min 1):
  - `book` → Books (relationship)
  - `title` (snapshot at inquiry time)
  - `quantity` (min: 1)
  - `price` (snapshot at inquiry time)
- `status` (select: new, contacted, resolved — default: new)
- `staffNotes` (internal, sidebar)

**Access**: Public create, admin/volunteer read/update/delete

**Hooks**: `enforcePaymentsDisabled` — blocks inquiry creation via REST/GraphQL when payments are enabled in StoreSettings

**Location**: `src/collections/Inquiries.ts`

---

## Globals (3 total)

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

### StoreSettings

**Purpose**: Payment processing and store behavior configuration

**Key Fields**:

- `paymentsEnabled` (checkbox, default: true) — toggles card payments vs inquiry mode
- `paymentsDisabledMessage` (textarea, max 500) — shown when payments off
- `squareConfigStatus` (UI field) — displays Square environment variable status

**Access**: Public read, admin update

**Hooks**: `invalidateSettingsCache` — calls `revalidateTag('store-payment-settings')` on change

**Location**: `src/globals/StoreSettings.ts`

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

Inquiries.items ──has-one──→ Books (per item)

Categories ──has-one──→ Categories (parent, for hierarchy)

Layout ──has-one──→ Media (logo)
```

## Database Technology

**Current**: PostgreSQL (production on Coolify) / SQLite (local development)

- Auto-detects from `DATABASE_URI` prefix (`postgres` → PostgreSQL, otherwise SQLite)
- Payload handles migrations automatically via `push: true`

## Access Patterns

### Public Access

- Read books, categories, subjects
- Read published events
- Read store settings
- Create contact submissions
- Create inquiries (when payments disabled)
- Create user accounts (self-registration)
- Process payments (anonymous checkout)

### Authenticated Users

- Read other users
- Update own profile
- Event registration

### Admin / Volunteer

- Read/manage contact submissions
- Read/manage inquiries
- Full event attendance management

### Admin Only

- User management (delete, role changes)
- Store settings updates
- Supplier full details
- System configuration

## Hooks

### Users Collection

- **beforeChange**: `enforceCustomerOnSelfRegistration` - Force customer role on non-admin creates

### Books Collection

- **beforeChange**: `validateStock` - Ensure stock quantity never negative
- **beforeChange**: `validatePricing` - Validate pricing hierarchy (cost < member < sell)
- **beforeChange**: `validateISBNFormat` - Validate ISBN-10 or ISBN-13 format
- **beforeChange**: `calculateStockStatus` - Auto-update stock status based on quantity
- **beforeChange**: `validateDigitalProduct` - Ensure digital products don't track inventory
- **afterChange**: `checkLowStock` - Log warnings for low stock items
- **afterChange**: `processSubjectsFromISBN` - Process staged subjects from ISBN lookup

### Sales Collection

- **beforeValidate**: `validateSaleItems` - Ensure items exist and are valid
- **beforeChange**: `generateReceiptNumber` - Auto-generate unique receipt numbers
- **beforeChange**: `calculateTotalAmount` - Sum line items for total
- **afterChange**: `deductStock` - Reduce book inventory on completed sales

### SaleItems Collection

- **beforeValidate**: `validateStockAvailability` - Check sufficient stock
- **beforeChange**: `setUnitPriceFromBook` - Copy current book price
- **beforeChange**: `calculateLineTotal` - Calculate quantity × price - discount

### EventAttendance Collection

- **beforeValidate**: `preventDuplicateRegistration` - One registration per user per event
- **beforeValidate**: `validateCapacityAndSetStatus` - Check capacity, set waitlist if full
- **beforeChange**: `setTimestamps` - Auto-set registeredAt, attendedAt, cancelledAt
- **afterChange**: `updateEventAttendeeCount` - Update event's registered count

### Inquiries Collection

- **beforeChange**: `enforcePaymentsDisabled` - Block creation when payments are enabled

### StoreSettings Global

- **afterChange**: `invalidateSettingsCache` - Revalidate Next.js cache tag

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

---

Last Updated: 2026-03-01
