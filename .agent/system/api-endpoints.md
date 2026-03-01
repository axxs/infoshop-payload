# API Endpoints

## Overview

Payload CMS auto-generates REST and GraphQL APIs for all collections. Custom endpoints handle specific business logic. Auth server actions provide registration/login/logout.

## Auto-Generated REST API

**Base URL**: `http://localhost:3000/api`

### Standard CRUD Endpoints (per collection)

```
GET    /api/{collection}           # List all (with query params)
GET    /api/{collection}/:id       # Get by ID
POST   /api/{collection}           # Create new
PATCH  /api/{collection}/:id       # Update existing
DELETE /api/{collection}/:id       # Delete by ID
```

### Collections Available

- `/api/users` - User management (public self-registration via POST)
- `/api/media` - File uploads
- `/api/books` - Book inventory
- `/api/categories` - Book categories
- `/api/subjects` - Subject tags
- `/api/suppliers` - Vendors
- `/api/events` - Store events
- `/api/event-attendance` - Event registrations
- `/api/sales` - Sales transactions
- `/api/sale-items` - Sale line items
- `/api/contact-submissions` - Contact form submissions (public create)
- `/api/inquiries` - Book purchase inquiries (public create, when payments disabled)

### Query Parameters

**Filtering**:

```
?where[field][operator]=value

Examples:
?where[title][like]=harry
?where[price][gte]=10
?where[category][equals]=fiction
```

**Pagination**:

```
?limit=10&page=2
```

**Sorting**:

```
?sort=-createdAt  # Descending
?sort=title       # Ascending
```

**Population** (relationships):

```
?depth=1  # Populate one level
?depth=2  # Populate two levels
```

## Globals REST API

```
GET    /api/globals/{slug}         # Read global
POST   /api/globals/{slug}         # Update global
```

### Globals Available

- `/api/globals/theme` - Theme configuration
- `/api/globals/layout` - Header, footer, homepage blocks
- `/api/globals/store-settings` - Payment toggle, Square status

## GraphQL API

**Endpoint**: `http://localhost:3000/api/graphql`

**Playground**: `http://localhost:3000/api/graphql-playground`

### Example Queries

**List Books**:

```graphql
query {
  Books(limit: 10) {
    docs {
      id
      title
      isbn
      sellPrice
    }
  }
}
```

**Book with Relationships**:

```graphql
query {
  Book(id: "abc123") {
    title
    isbn
    category {
      name
    }
    subjects {
      name
    }
    supplier {
      name
      code
    }
  }
}
```

## Custom Endpoints

### ISBN Lookup

**Path**: `/api/books/lookup-isbn`
**Method**: POST
**Purpose**: Lookup book metadata by ISBN via Open Library, Google Books, WorldCat
**Auth**: Authenticated users
**Body**: `{ "isbn": "978-0-123456-78-9" }`
**Response**: Book metadata with subjects and cover image URL

### CSV Import (3 endpoints)

**Path**: `/api/books/csv-import/preview`
**Method**: POST
**Purpose**: Parse and validate CSV, return preview with validation results
**Auth**: Admin only

**Path**: `/api/books/csv-import/execute`
**Method**: POST
**Purpose**: Execute validated import with duplicate handling strategy
**Auth**: Admin only

**Path**: `/api/books/csv-import/template`
**Method**: GET
**Purpose**: Download CSV template with correct column headers
**Auth**: Public

### Square Integration (2 endpoints)

**Path**: `/api/square/sync`
**Method**: POST
**Purpose**: Sync book catalog with Square POS inventory
**Auth**: Admin only (requires API key header)

**Path**: `/api/square/payments`
**Method**: POST
**Purpose**: Process Square card payment for checkout
**Auth**: Public (anonymous checkout supported)
**Rate Limit**: 5 requests/minute/IP
**Guards**: `paymentsEnabled` check via StoreSettings, input validation
**Body**: `{ "sourceId": "...", "amount": 1999, "currency": "AUD" }`

### Reports (4 endpoints)

**Path**: `/api/reports/revenue`
**Method**: GET
**Purpose**: Revenue tracking with day/week/month grouping
**Auth**: Admin only
**Query**: `?groupBy=day&startDate=2025-01-01&endDate=2025-01-31`

**Path**: `/api/reports/daily-sales`
**Method**: GET
**Purpose**: Daily sales breakdown with payment method analysis
**Auth**: Admin only
**Query**: `?date=2025-01-15`

**Path**: `/api/reports/product-sales`
**Method**: GET
**Purpose**: Product sales analysis with top sellers
**Auth**: Admin only
**Query**: `?limit=20&startDate=2025-01-01`

**Path**: `/api/reports/export`
**Method**: GET
**Purpose**: Export sales data as CSV for external analysis
**Auth**: Admin only
**Query**: `?startDate=2025-01-01&endDate=2025-01-31`

## Authentication

### Payload Built-in Auth

**Login**: `POST /api/users/login`
**Body**: `{ "email": "...", "password": "..." }`
**Response**: `{ "token": "jwt-token", "user": { ... }, "exp": 1234567890 }`

**Me (Current User)**: `GET /api/users/me`
**Headers**: `Authorization: JWT {token}`

**Logout**: `POST /api/users/logout`

### Auth Server Actions (`src/lib/auth/actions.ts`)

Next.js Server Actions with built-in CSRF protection (used by frontend forms):

- `registerUser(formData)` — Zod-validated, rate-limited (5/IP/15min), auto-login, sets `payload-token` cookie
- `loginUser(formData)` — Zod-validated, sets `payload-token` cookie
- `logoutUser()` — Deletes `payload-token` cookie (stateless JWT, no server-side revocation)

### Auth Utilities

- `getCurrentUser()` (`src/lib/auth/getCurrentUser.ts`) — Server-only function, reads user from request headers via `payload.auth()`
- `sanitizeRedirect()` (`src/lib/auth/sanitizeRedirect.ts`) — Prevents open redirect attacks on `?redirect=` params

### Cookie Settings

- Name: `payload-token`
- `httpOnly: true`, `secure` in production, `sameSite: 'lax'`, `path: '/'`
- Max age: 7 days

## Access Control

APIs respect collection-level access control:

- Public create for users (self-registration), contact submissions, inquiries
- Public read for books, categories, subjects, events, store settings
- Authenticated required for reading users
- Admin/volunteer for contact submissions, inquiries management
- Admin only for user deletion, store settings updates, supplier full access

## Error Responses

**401 Unauthorized**:

```json
{
  "errors": [{ "message": "You are not allowed to perform this action." }]
}
```

**400 Validation Error**:

```json
{
  "errors": [{ "message": "Title is required", "field": "title" }]
}
```

**429 Rate Limited** (payments endpoint):

```json
{
  "success": false,
  "error": "Too many payment attempts. Please try again later."
}
```

---

Last Updated: 2026-03-01
