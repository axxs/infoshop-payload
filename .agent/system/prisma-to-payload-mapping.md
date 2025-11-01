# Prisma to Payload Migration Mapping

**Purpose**: Complete field-level mapping from PostgreSQL/Prisma schema to Payload CMS collections.

**Source Database**: `/home/axxs/infoshop` - PostgreSQL with Prisma ORM
**Target Database**: `/home/axxs/infoshop-payload` - SQLite → PostgreSQL with Payload CMS

---

## Migration Scope

### Collections to Migrate ✅

1. **Users** - User accounts with authentication
2. **Books** - Book inventory with pricing and stock
3. **Categories** - Hierarchical book categories
4. **Subjects** - Flat subject tags (many-to-many with Books)
5. **Suppliers** - Vendor/supplier information
6. **Events** - Store events and workshops
7. **Media** - File uploads (cover images, event images)

### Collections NOT Migrating ❌

8. **Sales** & **SaleItems** - Phase 3 (Square POS Integration)
9. **EventAttendance** - Phase 4 (Customer Storefront)
10. **VolunteerShift** - Future feature (not in current scope)
11. **CollectiveDecision** - Future feature (not in current scope)
12. **Configuration** - Payload has built-in config management
13. **Page**, **ContentBlock**, **Theme** - Payload has built-in CMS features

---

## 1. Users Collection

### Prisma Model → Payload Collection

| Prisma Field   | Prisma Type      | Payload Field  | Payload Type   | Transformation                                    |
| -------------- | ---------------- | -------------- | -------------- | ------------------------------------------------- |
| `id`           | `String @id`     | `id`           | Auto-generated | UUID → Payload ID                                 |
| `email`        | `String @unique` | `email`        | `email`        | Direct copy                                       |
| `passwordHash` | `String?`        | Password field | Hash           | Payload handles hashing                           |
| `name`         | `String`         | `name`         | `text`         | Direct copy                                       |
| `isVolunteer`  | `Boolean`        | `role`         | `select`       | Map to role field                                 |
| `joinedAt`     | `DateTime`       | `createdAt`    | Auto-timestamp | Use Payload timestamp                             |
| `lastLoginAt`  | `DateTime?`      | -              | -              | **Not migrated** (Payload tracks this separately) |
| `googleId`     | `String?`        | -              | -              | **Not migrated** (OAuth Phase 4)                  |
| `facebookId`   | `String?`        | -              | -              | **Not migrated** (OAuth Phase 4)                  |
| `createdAt`    | `DateTime`       | `createdAt`    | Auto-timestamp | Direct mapping                                    |
| `updatedAt`    | `DateTime`       | `updatedAt`    | Auto-timestamp | Direct mapping                                    |

### Transformations Needed

1. **Password Migration**: Extract `passwordHash` and import into Payload's auth system
2. **Role Mapping**:
   - `isVolunteer: true` → `role: 'volunteer'`
   - Default users → `role: 'user'`
   - Admin users (to be identified) → `role: 'admin'`
3. **OAuth Fields**: Skip social login fields (Phase 4 feature)

### Special Considerations

- **First Admin User**: Ensure at least one user has `role: 'admin'`
- **Password Hashes**: Prisma hashes are bcrypt - verify compatibility with Payload
- **Relations**: Skip event/sale relations (handled by Phase 3/4)

---

## 2. Books Collection

### Prisma Model → Payload Collection

| Prisma Field        | Prisma Type     | Payload Field        | Payload Type             | Transformation             |
| ------------------- | --------------- | -------------------- | ------------------------ | -------------------------- |
| `id`                | `String @id`    | `id`                 | Auto-generated           | UUID → Payload ID          |
| `isbn`              | `String?`       | `isbn`               | `text`                   | Direct copy                |
| `oclcNumber`        | `String?`       | `oclcNumber`         | `text`                   | Direct copy                |
| `title`             | `String`        | `title`              | `text`                   | Direct copy                |
| `author`            | `String?`       | `author`             | `text`                   | Direct copy                |
| `publisher`         | `String?`       | `publisher`          | `text`                   | Direct copy                |
| `description`       | `String?`       | `description`        | `textarea`               | Direct copy                |
| `costPrice`         | `Decimal(10,2)` | `pricing.cost`       | `number`                 | Map to group               |
| `sellPrice`         | `Decimal(10,2)` | `pricing.retail`     | `number`                 | Map to group               |
| `memberPrice`       | `Decimal(10,2)` | `pricing.member`     | `number`                 | Map to group               |
| `currency`          | `Currency`      | `pricing.currency`   | `select`                 | Map to group               |
| `stockQuantity`     | `Int`           | `stock.quantity`     | `number`                 | Map to group               |
| `reorderLevel`      | `Int`           | `stock.reorderLevel` | `number`                 | Map to group               |
| `isDigital`         | `Boolean`       | `isDigital`          | `checkbox`               | Direct copy                |
| `downloadUrl`       | `String?`       | `downloadUrl`        | `text`                   | Direct copy                |
| `fileSize`          | `Int?`          | `fileSize`           | `number`                 | Direct copy                |
| `coverImageUrl`     | `String?`       | `coverImage`         | `text`                   | Direct copy (external URL) |
| `coverImageId`      | `String?`       | `coverImage`         | `upload`                 | Lookup Media by ID         |
| `categoryId`        | `String?`       | `category`           | `relationship`           | Lookup Category by ID      |
| `supplierId`        | `String?`       | `supplier`           | `relationship`           | Lookup Supplier by ID      |
| `subjects`          | `BookSubject[]` | `subjects`           | `relationship` (hasMany) | Resolve join table         |
| `squareItemId`      | `String?`       | -                    | -                        | **Not migrated** (Phase 3) |
| `squareVariationId` | `String?`       | -                    | -                        | **Not migrated** (Phase 3) |
| `lastSyncedAt`      | `DateTime?`     | -                    | -                        | **Not migrated** (Phase 3) |
| `createdAt`         | `DateTime`      | `createdAt`          | Auto-timestamp           | Direct mapping             |
| `updatedAt`         | `DateTime`      | `updatedAt`          | Auto-timestamp           | Direct mapping             |

### Transformations Needed

1. **Pricing Group**: Flatten nested Prisma fields into Payload group:

   ```typescript
   {
     costPrice: 10.00,
     sellPrice: 15.00,
     memberPrice: 12.00,
     currency: 'USD'
   }
   →
   {
     pricing: {
       cost: 10.00,
       retail: 15.00,
       member: 12.00,
       currency: 'USD'
     }
   }
   ```

2. **Stock Group**: Similar grouping for stock fields

3. **Cover Images**: Handle dual approach:
   - If `coverImageId` exists → lookup Payload Media document
   - If only `coverImageUrl` exists → store as text (external URL)

4. **Subject Relationships**: Resolve `BookSubject` join table:

   ```sql
   SELECT subjectId FROM BookSubject WHERE bookId = ?
   ```

5. **Category/Supplier**: Lookup Payload document IDs by Prisma UUIDs

### Special Considerations

- **Decimal Precision**: Prisma uses `Decimal(10,2)` - ensure Payload number fields maintain precision
- **Currency**: Currently only USD in Prisma enum - may need to expand
- **Stock Alerts**: Payload doesn't auto-send alerts - Phase 3 feature
- **Square Sync**: Skip Square-related fields (Phase 3)

---

## 3. Categories Collection

### Prisma Model → Payload Collection

| Prisma Field | Prisma Type      | Payload Field | Payload Type   | Transformation          |
| ------------ | ---------------- | ------------- | -------------- | ----------------------- |
| `id`         | `String @id`     | `id`          | Auto-generated | UUID → Payload ID       |
| `name`       | `String @unique` | `name`        | `text`         | Direct copy             |
| `slug`       | `String @unique` | `slug`        | `text` (auto)  | Direct copy             |
| `parentId`   | `String?`        | `parent`      | `relationship` | Self-referential lookup |
| `createdAt`  | `DateTime`       | `createdAt`   | Auto-timestamp | Direct mapping          |
| `updatedAt`  | `DateTime`       | `updatedAt`   | Auto-timestamp | Direct mapping          |

### Transformations Needed

1. **Parent Relationships**:
   - Migrate top-level categories first (parentId = null)
   - Then migrate child categories with parent lookups
   - Order: breadth-first traversal to ensure parents exist before children

2. **Slug Generation**: Payload can auto-generate slugs, but preserve existing ones

### Special Considerations

- **Hierarchical Order**: Must maintain tree structure integrity
- **Circular References**: Validate no circular parent relationships exist
- **Orphaned Categories**: Identify categories with non-existent parentIds

---

## 4. Subjects Collection

### Prisma Model → Payload Collection

| Prisma Field  | Prisma Type      | Payload Field | Payload Type   | Transformation    |
| ------------- | ---------------- | ------------- | -------------- | ----------------- |
| `id`          | `String @id`     | `id`          | Auto-generated | UUID → Payload ID |
| `name`        | `String @unique` | `name`        | `text`         | Direct copy       |
| `slug`        | `String @unique` | `slug`        | `text` (auto)  | Direct copy       |
| `description` | `String?`        | `description` | `textarea`     | Direct copy       |
| `createdAt`   | `DateTime`       | `createdAt`   | Auto-timestamp | Direct mapping    |
| `updatedAt`   | `DateTime`       | `updatedAt`   | Auto-timestamp | Direct mapping    |

### Transformations Needed

1. **Direct Migration**: Subjects are flat (no hierarchy) - straightforward copy

### Special Considerations

- **No Dependencies**: Can be migrated in any order
- **Many-to-Many**: Book relationships resolved via Books migration

---

## 5. Suppliers Collection

### Prisma Model → Payload Collection

| Prisma Field   | Prisma Type  | Payload Field  | Payload Type   | Transformation            |
| -------------- | ------------ | -------------- | -------------- | ------------------------- |
| `id`           | `String @id` | `id`           | Auto-generated | UUID → Payload ID         |
| `name`         | `String`     | `name`         | `text`         | Direct copy               |
| `contactEmail` | `String?`    | `contactEmail` | `email`        | Direct copy               |
| `contactPhone` | `String?`    | `contactPhone` | `text`         | Direct copy               |
| `website`      | `String?`    | `website`      | `text`         | Direct copy               |
| `notes`        | `String?`    | `notes`        | `richText`     | Convert to Lexical format |
| `createdAt`    | `DateTime`   | `createdAt`    | Auto-timestamp | Direct mapping            |
| `updatedAt`    | `DateTime`   | `updatedAt`    | Auto-timestamp | Direct mapping            |

### Transformations Needed

1. **Notes Field**: Convert plain text to Lexical rich text format:
   ```javascript
   {
     notes: "Plain text notes..."
   }
   →
   {
     notes: {
       root: {
         type: 'root',
         children: [{
           type: 'paragraph',
           children: [{ type: 'text', text: 'Plain text notes...' }]
         }]
       }
     }
   }
   ```

### Special Considerations

- **No Dependencies**: Can be migrated before Books
- **Rich Text Conversion**: Simple text-to-Lexical transformation

---

## 6. Events Collection

### Prisma Model → Payload Collection

| Prisma Field   | Prisma Type      | Payload Field  | Payload Type   | Transformation             |
| -------------- | ---------------- | -------------- | -------------- | -------------------------- |
| `id`           | `String @id`     | `id`           | Auto-generated | UUID → Payload ID          |
| `title`        | `String`         | `title`        | `text`         | Direct copy                |
| `description`  | `String?`        | `description`  | `richText`     | Convert to Lexical         |
| `eventType`    | `EventType`      | `eventType`    | `select`       | Map enum values            |
| `startTime`    | `DateTime`       | `startDate`    | `date`         | Direct copy                |
| `endTime`      | `DateTime`       | `endDate`      | `date`         | Direct copy                |
| `location`     | `String?`        | `location`     | `text`         | Direct copy                |
| `maxAttendees` | `Int?`           | `maxAttendees` | `number`       | Direct copy                |
| `price`        | `Decimal(10,2)?` | `price`        | `number`       | Direct copy                |
| `status`       | `EventStatus`    | `status`       | `select`       | Map enum values            |
| `createdById`  | `String`         | -              | -              | **Not migrated** (Phase 4) |
| `createdAt`    | `DateTime`       | `createdAt`    | Auto-timestamp | Direct mapping             |
| `updatedAt`    | `DateTime`       | `updatedAt`    | Auto-timestamp | Direct mapping             |

### Transformations Needed

1. **Enum Mapping**:
   - `EventType`: BOOK_SIGNING, READING, DISCUSSION, WORKSHOP, OTHER
   - `EventStatus`: UPCOMING, ONGOING, COMPLETED, CANCELLED

2. **Description**: Convert plain text to Lexical rich text (same as Suppliers)

3. **Event Images**: If events reference Media, lookup Payload Media documents

### Special Considerations

- **Event Attendance**: Skip EventAttendance records (Phase 4 feature)
- **Creator**: Skip createdById (will use current admin user)
- **Dates**: Ensure timezone handling is consistent

---

## 7. Media Collection

### Prisma Model → Payload Collection

| Prisma Field   | Prisma Type  | Payload Field | Payload Type   | Transformation                                    |
| -------------- | ------------ | ------------- | -------------- | ------------------------------------------------- |
| `id`           | `String @id` | `id`          | Auto-generated | UUID → Payload ID                                 |
| `filename`     | `String`     | `filename`    | Auto-generated | Payload handles                                   |
| `path`         | `String`     | File path     | Auto-generated | Copy physical file                                |
| `mimeType`     | `String`     | `mimeType`    | Auto-generated | Direct copy                                       |
| `fileSize`     | `Int`        | `filesize`    | Auto-generated | Direct copy                                       |
| `width`        | `Int?`       | `width`       | Auto-generated | Direct copy (images only)                         |
| `height`       | `Int?`       | `height`      | Auto-generated | Direct copy (images only)                         |
| `altText`      | `String?`    | `alt`         | `text`         | Direct copy                                       |
| `tags`         | `String[]`   | -             | -              | **Not migrated** (use Payload's built-in tagging) |
| `title`        | `String?`    | `title`       | `text`         | Direct copy                                       |
| `description`  | `String?`    | `description` | `textarea`     | Direct copy                                       |
| `uploadedById` | `String?`    | -             | -              | **Not migrated** (use current admin)              |
| `createdAt`    | `DateTime`   | `createdAt`   | Auto-timestamp | Direct mapping                                    |
| `updatedAt`    | `DateTime`   | `updatedAt`   | Auto-timestamp | Direct mapping                                    |

### Transformations Needed

1. **File Migration**:
   - Copy physical files from old `media/` directory to new location
   - Preserve directory structure or flatten based on Payload config

2. **Image Metadata**: Width/height auto-calculated by Payload (Sharp)

3. **Upload**: Use Payload's `create` API with file buffer

### Special Considerations

- **Physical Files**: Must copy actual files, not just database records
- **File Paths**: Old system uses relative paths - map to new media directory
- **Broken References**: Identify missing files before migration

---

## Migration Order

To maintain referential integrity, migrate in this order:

1. **Users** (no dependencies)
2. **Media** (no dependencies, but needed by Books/Events)
3. **Categories** (parent-child relationships, breadth-first)
4. **Subjects** (no dependencies)
5. **Suppliers** (no dependencies)
6. **Events** (may reference Media)
7. **Books** (references Categories, Subjects, Suppliers, Media)

---

## Data Export Queries

### Export Users

```sql
SELECT
  id,
  email,
  "passwordHash",
  name,
  "isVolunteer",
  "joinedAt",
  "createdAt",
  "updatedAt"
FROM "User"
WHERE "googleId" IS NULL
  AND "facebookId" IS NULL
ORDER BY "createdAt";
```

### Export Books with Relationships

```sql
SELECT
  b.id,
  b.isbn,
  b."oclcNumber",
  b.title,
  b.author,
  b.publisher,
  b.description,
  b."costPrice",
  b."sellPrice",
  b."memberPrice",
  b.currency,
  b."stockQuantity",
  b."reorderLevel",
  b."isDigital",
  b."downloadUrl",
  b."fileSize",
  b."coverImageUrl",
  b."coverImageId",
  b."categoryId",
  b."supplierId",
  ARRAY_AGG(bs."subjectId") as subject_ids,
  b."createdAt",
  b."updatedAt"
FROM "Book" b
LEFT JOIN "BookSubject" bs ON b.id = bs."bookId"
GROUP BY b.id
ORDER BY b."createdAt";
```

### Export Categories (Hierarchical)

```sql
WITH RECURSIVE category_tree AS (
  -- Base case: root categories
  SELECT
    id,
    name,
    slug,
    "parentId",
    0 AS depth,
    ARRAY[id] AS path
  FROM "Category"
  WHERE "parentId" IS NULL

  UNION ALL

  -- Recursive case: child categories
  SELECT
    c.id,
    c.name,
    c.slug,
    c."parentId",
    ct.depth + 1,
    ct.path || c.id
  FROM "Category" c
  JOIN category_tree ct ON c."parentId" = ct.id
)
SELECT * FROM category_tree
ORDER BY depth, name;
```

### Export Subjects

```sql
SELECT
  id,
  name,
  slug,
  description,
  "createdAt",
  "updatedAt"
FROM "Subject"
ORDER BY name;
```

### Export Suppliers

```sql
SELECT
  id,
  name,
  "contactEmail",
  "contactPhone",
  website,
  notes,
  "createdAt",
  "updatedAt"
FROM "Supplier"
ORDER BY name;
```

### Export Events

```sql
SELECT
  id,
  title,
  description,
  "eventType",
  "startTime",
  "endTime",
  location,
  "maxAttendees",
  price,
  status,
  "createdAt",
  "updatedAt"
FROM "Event"
WHERE status IN ('UPCOMING', 'COMPLETED')
ORDER BY "startTime";
```

### Export Media with File Paths

```sql
SELECT
  id,
  filename,
  path,
  "mimeType",
  "fileSize",
  width,
  height,
  "altText",
  title,
  description,
  "createdAt",
  "updatedAt"
FROM "Media"
ORDER BY "createdAt";
```

---

## Validation Queries

### Count Records by Collection

```sql
-- Users
SELECT COUNT(*) as user_count FROM "User" WHERE "googleId" IS NULL AND "facebookId" IS NULL;

-- Books
SELECT COUNT(*) as book_count FROM "Book";

-- Categories
SELECT COUNT(*) as category_count FROM "Category";

-- Subjects
SELECT COUNT(*) as subject_count FROM "Subject";

-- Suppliers
SELECT COUNT(*) as supplier_count FROM "Supplier";

-- Events
SELECT COUNT(*) as event_count FROM "Event";

-- Media
SELECT COUNT(*) as media_count FROM "Media";

-- Book-Subject Relationships
SELECT COUNT(*) as book_subject_count FROM "BookSubject";
```

### Identify Orphaned Records

```sql
-- Books with non-existent categories
SELECT COUNT(*) as orphaned_books
FROM "Book" b
LEFT JOIN "Category" c ON b."categoryId" = c.id
WHERE b."categoryId" IS NOT NULL
  AND c.id IS NULL;

-- Books with non-existent suppliers
SELECT COUNT(*) as orphaned_books
FROM "Book" b
LEFT JOIN "Supplier" s ON b."supplierId" = s.id
WHERE b."supplierId" IS NOT NULL
  AND s.id IS NULL;

-- Categories with non-existent parents
SELECT COUNT(*) as orphaned_categories
FROM "Category" c1
LEFT JOIN "Category" c2 ON c1."parentId" = c2.id
WHERE c1."parentId" IS NOT NULL
  AND c2.id IS NULL;

-- Book subjects with non-existent books
SELECT COUNT(*) as orphaned_booksubjects
FROM "BookSubject" bs
LEFT JOIN "Book" b ON bs."bookId" = b.id
WHERE b.id IS NULL;

-- Book subjects with non-existent subjects
SELECT COUNT(*) as orphaned_booksubjects
FROM "BookSubject" bs
LEFT JOIN "Subject" s ON bs."subjectId" = s.id
WHERE s.id IS NULL;
```

---

## Next Steps

1. **Export Data**: Run export queries to generate JSON files for each collection
2. **Validate Exports**: Check for orphaned records and data integrity issues
3. **Create Migration Script**: Build `scripts/migrate-from-prisma.ts` using mappings above
4. **Test Migration**: Run against test database first
5. **Verify Results**: Compare record counts and spot-check data accuracy

---

Last Updated: 2025-11-01
