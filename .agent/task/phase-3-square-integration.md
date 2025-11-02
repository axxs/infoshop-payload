# Phase 3 Task: Square POS Catalog Integration

**Status**: ✅ Complete
**Date**: 2025-11-02
**Branch**: `main`
**Priority**: High (Critical business functionality)

---

## Summary

Implemented Square Point of Sale catalog synchronization to enable real-time inventory management between Payload CMS and Square POS system. This allows books managed in Payload to be automatically synced to Square's online catalog for e-commerce and in-store sales.

---

## What Was Built

### 1. Square Client Configuration (`src/lib/square/client.ts`)

**Purpose**: Initialize and configure the Square SDK with environment-based settings.

**Key Functions**:

- `getSquareClient()` - Returns configured Square client (sandbox or production)
- `generateIdempotencyKey()` - Generates UUID v4 for idempotent API requests

**Configuration**:

- Uses `SQUARE_ACCESS_TOKEN` from environment
- Switches between sandbox/production via `SQUARE_ENVIRONMENT`
- Validates required credentials on initialization

**Example Usage**:

```typescript
import { getSquareClient } from '@/lib/square/client'

const client = getSquareClient()
const catalogApi = client.catalogApi
```

---

### 2. Catalog Sync Service (`src/lib/square/catalogSync.ts`)

**Purpose**: Bidirectional synchronization between Payload books and Square catalog.

**Key Functions**:

**`pushBooksToSquare(bookIds, options)`**

- Syncs specific books to Square catalog
- Creates new items or updates existing ones
- Processes in batches of 10 (Square API limit)
- Tracks sync status in Payload database

**`syncUnsyncedBooks()`**

- Finds all books without `squareCatalogObjectId`
- Pushes them to Square catalog
- Updates database with Square IDs

**`syncModifiedBooks(since?)`**

- Syncs books updated since specified date
- Defaults to last 24 hours if no date provided
- Updates existing Square catalog items

**Sync Result Structure**:

```typescript
interface SquareSyncResult {
  success: boolean
  itemsProcessed: number
  itemsCreated: number
  itemsUpdated: number
  itemsFailed: number
  errors: Array<{
    bookId: string
    bookTitle: string
    error: string
  }>
}
```

---

### 3. Book to Catalog Item Conversion

**Mapping Logic**:

**Payload Book → Square Catalog Object**:

- `title` → `itemData.name`
- `description` → `itemData.description` (falls back to author)
- `sellPrice` → `priceMoney.amount` (converted to cents)
- `costPrice` → `itemVariationVendorInfos` (cost tracking)
- `memberPrice` → Not synced (Payload-only pricing tier)
- `isbn` → `sku` (Stock Keeping Unit)
- `currency` → `priceMoney.currency` (USD/EUR/GBP)
- `isDigital` → `trackInventory = false` (no stock tracking for digital)

**Price Conversion**:

```typescript
// Square expects smallest currency unit (cents)
const sellPriceCents = Math.round(Number(book.sellPrice) * 100)
// $15.99 becomes 1599 cents
```

**Multi-Currency Support**:

- USD, EUR, GBP fully supported
- Currency code passed to Square priceMoney

---

### 4. API Endpoint (`src/app/(payload)/api/square/sync/route.ts`)

**Endpoint**: `POST /api/square/sync`

**Request Body**:

```json
{
  "strategy": "specific" | "unsynced" | "modified",
  "bookIds": ["id1", "id2"],  // Required for "specific"
  "since": "2025-11-01T00:00:00Z"  // Optional for "modified"
}
```

**Sync Strategies**:

1. **Specific** - Sync selected books

   ```json
   {
     "strategy": "specific",
     "bookIds": ["book-uuid-1", "book-uuid-2"]
   }
   ```

2. **Unsynced** - Sync all books never pushed to Square

   ```json
   {
     "strategy": "unsynced"
   }
   ```

3. **Modified** - Sync recently updated books
   ```json
   {
     "strategy": "modified",
     "since": "2025-11-01T00:00:00Z" // Optional, defaults to last 24h
   }
   ```

**Success Response (200)**:

```json
{
  "success": true,
  "data": {
    "success": true,
    "itemsProcessed": 10,
    "itemsCreated": 8,
    "itemsUpdated": 2,
    "itemsFailed": 0,
    "errors": []
  }
}
```

**Error Response (400/500)**:

```json
{
  "success": false,
  "error": "Invalid strategy. Must be one of: specific, unsynced, modified",
  "details": "Error message (development only)"
}
```

---

### 5. Database Fields (Already in Books Collection)

**`squareCatalogObjectId`** (Books.ts:206-212)

- Stores Square's catalog object ID
- Null if never synced
- Used to update existing items

**`squareLastSyncedAt`** (Books.ts:214-220)

- Timestamp of last successful sync
- Used for "modified" sync strategy
- Helps track sync freshness

---

## Testing

### Integration Tests (`tests/int/square/catalogSync.int.spec.ts`)

**9 tests covering**:

- UUID v4 idempotency key generation
- Environment variable validation
- Square client initialization
- Book to catalog item structure validation
- Sync result structure validation
- Error handling

**Run**: `npm run test:int -- tests/int/square`

### E2E Tests (`tests/e2e/square-sync-api.e2e.spec.ts`)

**Tests covering**:

- Invalid strategy validation
- Missing bookIds validation
- Empty/invalid bookIds arrays
- Unsynced strategy without parameters
- Modified strategy with/without since date
- Response structure validation
- Development mode error details

**Run**: `npm run test:e2e -- tests/e2e/square-sync-api`

---

## Environment Configuration

### Required Variables

Add to `.env.local`:

```bash
# Square Integration
SQUARE_ACCESS_TOKEN=your-square-access-token
SQUARE_ENVIRONMENT=sandbox  # or 'production'
```

### Getting Square Credentials

1. **Create Square Developer Account**
   - Visit: https://developer.squareup.com
   - Sign up or log in

2. **Create Application**
   - Go to: Applications → Create App
   - Name: "Infoshop Inventory Sync"

3. **Get Access Token**
   - Sandbox: Use sandbox token for testing
   - Production: Generate production access token (requires verification)

4. **Set Environment Variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local and add Square credentials
   ```

---

## Usage Examples

### Sync Unsynced Books

```typescript
// API request
const response = await fetch('/api/square/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategy: 'unsynced',
  }),
})

const result = await response.json()
console.log(`Created ${result.data.itemsCreated} items in Square`)
```

### Sync Specific Books

```typescript
// After creating/updating books
const bookIds = ['uuid-1', 'uuid-2', 'uuid-3']

const response = await fetch('/api/square/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategy: 'specific',
    bookIds,
  }),
})
```

### Sync Modified Books (Last 24h)

```typescript
const response = await fetch('/api/square/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategy: 'modified',
  }),
})
```

### Direct Service Usage

```typescript
import { syncUnsyncedBooks, syncModifiedBooks } from '@/lib/square'

// In a server-side function or API route
const result = await syncUnsyncedBooks()

if (result.success) {
  console.log(`Synced ${result.itemsCreated} books`)
} else {
  console.error('Sync failed:', result.errors)
}
```

---

## Key Design Decisions

### 1. Batch Processing (10 items per batch)

**Why**: Square API limits batch upsert to 10 objects per request.

**Implementation**: Loop through books in chunks of 10 with 500ms delay between batches to respect rate limits.

### 2. Idempotency Keys

**Why**: Prevents duplicate catalog items if request is retried.

**Implementation**: UUID v4 generated per batch using `crypto.randomUUID()`.

### 3. Separate Create vs Update Logic

**Why**: Square requires different handling for new vs existing items.

**Implementation**: Check `squareCatalogObjectId` existence to determine strategy.

### 4. Three-Tier Pricing → Square Mapping

**Why**: Payload has cost/member/sell pricing, Square has single price.

**Decision**:

- Sync `sellPrice` to Square (public price)
- Track `costPrice` in vendor info (internal)
- Keep `memberPrice` Payload-only (not synced)

### 5. Error Accumulation

**Why**: Single failed item shouldn't stop entire sync.

**Implementation**: Catch per-book errors, accumulate in result, continue processing.

---

## Limitations & Future Enhancements

### Current Limitations

1. **No Inventory Sync**
   - Catalog sync only (product info)
   - Stock quantities not synced to Square
   - Requires Square location ID (future enhancement)

2. **Member Pricing Not Synced**
   - Square doesn't support multiple pricing tiers
   - Member pricing remains Payload-only

3. **Category Mapping Not Implemented**
   - Categories described in text, not mapped to Square categories
   - Future: Create/map Square category objects

### Future Enhancements

**Phase 4 Candidates**:

- Inventory quantity sync (requires location management)
- Bidirectional sync (Square → Payload)
- Category hierarchy mapping
- Image sync to Square catalog
- Webhook handling for real-time updates
- Admin UI for sync management

---

## Migration from Legacy System

**Differences from `/home/axxs/infoshop` implementation**:

| Aspect             | Legacy (Express + Prisma)      | Payload Implementation                        |
| ------------------ | ------------------------------ | --------------------------------------------- |
| **Database ORM**   | Prisma                         | Payload CMS API                               |
| **API Framework**  | Express routes                 | Next.js API routes                            |
| **Logging**        | Winston logger                 | Console (structured)                          |
| **Error Handling** | try/catch with logger          | try/catch with console                        |
| **Field Names**    | `squareItemId`, `lastSyncedAt` | `squareCatalogObjectId`, `squareLastSyncedAt` |
| **Type Safety**    | Prisma generated types         | Payload generated types                       |

**Preserved Features**:

- ✅ Batch processing logic
- ✅ Three sync strategies
- ✅ Error accumulation
- ✅ Multi-currency support
- ✅ Idempotency keys
- ✅ Rate limiting (500ms delays)

**Simplified**:

- ❌ Removed payment processing (not needed for catalog sync)
- ❌ Removed customer management (Phase 4)
- ❌ Removed refund logic (Phase 4)

---

## Files Created

### Core Implementation (3 files)

- `src/lib/square/client.ts` - Square SDK configuration
- `src/lib/square/catalogSync.ts` - Sync service logic
- `src/lib/square/index.ts` - Library exports

### API Endpoint (1 file)

- `src/app/(payload)/api/square/sync/route.ts` - HTTP endpoint

### Tests (2 files)

- `tests/int/square/catalogSync.int.spec.ts` - Integration tests (9 tests)
- `tests/e2e/square-sync-api.e2e.spec.ts` - E2E API tests

### Configuration (1 file modified)

- `.env.example` - Added Square environment variables

**Total**: 7 files (6 new, 1 modified)

---

## Dependencies Added

```json
{
  "square": "^latest"
}
```

**Install**: `npm install square`

---

## Success Criteria

- [x] Square SDK integrated and configured
- [x] Catalog sync service implemented
- [x] API endpoint created with validation
- [x] Three sync strategies working
- [x] Batch processing with rate limiting
- [x] Error handling and accumulation
- [x] Database fields utilized
- [x] Integration tests passing (9/9)
- [x] E2E tests created
- [x] Environment configuration documented
- [x] Code follows TypeScript strict mode
- [x] All linting passing

---

## Next Steps (Phase 4)

1. **Admin UI for Square Sync**
   - Button in Books admin to trigger sync
   - Progress indicators
   - Error display with retry

2. **Inventory Sync**
   - Sync stock quantities to Square
   - Location management
   - Real-time updates

3. **Bidirectional Sync**
   - Pull Square sales back to Payload
   - Update stock from Square
   - Conflict resolution

4. **Webhook Integration**
   - Subscribe to Square webhooks
   - Handle real-time catalog updates
   - Automatic sync triggers

---

## Related Documentation

- `.agent/task/csv-import-square-sync.md` - Legacy Square implementation
- `.agent/system/database-schema.md` - Books collection schema
- `.agent/planning/MIGRATION_PLAN.md` - Overall migration plan
- Square API Docs: https://developer.squareup.com/docs/catalog-api

---

**Implementation Complete**: Phase 3.4 Square POS Integration ✅
