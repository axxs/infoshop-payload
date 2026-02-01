# API Endpoints

## Overview

Payload CMS auto-generates REST and GraphQL APIs for all collections. Custom endpoints can be added for specific business logic.

## Auto-Generated REST API

**Base URL**: `http://localhost:3001/api`

### Standard CRUD Endpoints (per collection)

```
GET    /api/{collection}           # List all (with query params)
GET    /api/{collection}/:id       # Get by ID
POST   /api/{collection}           # Create new
PATCH  /api/{collection}/:id       # Update existing
DELETE /api/{collection}/:id       # Delete by ID
```

### Collections Available

- `/api/users` - User management
- `/api/media` - File uploads
- `/api/books` - Book inventory
- `/api/categories` - Book categories
- `/api/subjects` - Subject tags
- `/api/suppliers` - Vendors
- `/api/events` - Store events
- `/api/event-attendance` - Event registrations
- `/api/sales` - Sales transactions
- `/api/sale-items` - Sale line items

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

## GraphQL API

**Endpoint**: `http://localhost:3001/api/graphql`

**Playground**: `http://localhost:3001/api/graphql-playground`

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

## Custom Endpoints (Implemented)

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
**Purpose**: Process Square payment for checkout
**Auth**: Authenticated users
**Body**: `{ "sourceId": "...", "amount": 1999, "orderId": "..." }`

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

### Login

**Path**: `/api/users/login`
**Method**: POST
**Body**:

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**:

```json
{
  "token": "jwt-token",
  "user": { ... },
  "exp": 1234567890
}
```

### Me (Current User)

**Path**: `/api/users/me`
**Method**: GET
**Headers**: `Authorization: JWT {token}`

### Logout

**Path**: `/api/users/logout`
**Method**: POST

## Access Control

APIs respect collection-level access control:

- Public read for books, categories, subjects
- Authenticated required for create/update/delete
- Admin only for users, suppliers (full access)

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

**404 Not Found**:

```json
{
  "errors": [{ "message": "Document not found" }]
}
```

## Testing APIs

**cURL Example**:

```bash
# List books
curl http://localhost:3001/api/books

# Get book with ID
curl http://localhost:3001/api/books/abc123

# Create book (requires auth)
curl -X POST http://localhost:3001/api/books \
  -H "Authorization: JWT {token}" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Book", "sellPrice": 19.99}'
```

---

Last Updated: 2025-02-01
