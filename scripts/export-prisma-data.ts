/**
 * Export Data from Prisma/PostgreSQL Database
 *
 * This script connects to the old Infoshop PostgreSQL database
 * and exports all data needed for migration to Payload CMS.
 *
 * Usage: npx tsx scripts/export-prisma-data.ts
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://infoshop:infoshop@localhost:5432/infoshop?schema=public',
    },
  },
})

interface ExportStats {
  collection: string
  count: number
  exported: number
  errors: number
}

const stats: ExportStats[] = []

async function exportData(): Promise<void> {
  console.log('🔍 Starting data export from Prisma database...\n')

  const exportDir = path.join(process.cwd(), 'scripts', 'export-data')
  await fs.mkdir(exportDir, { recursive: true })

  try {
    // 1. Export Users (excluding OAuth users)
    await exportUsers(exportDir)

    // 2. Export Media
    await exportMedia(exportDir)

    // 3. Export Categories (hierarchical order)
    await exportCategories(exportDir)

    // 4. Export Subjects
    await exportSubjects(exportDir)

    // 5. Export Suppliers
    await exportSuppliers(exportDir)

    // 6. Export Events
    await exportEvents(exportDir)

    // 7. Export Books (with relationships)
    await exportBooks(exportDir)

    // 8. Export validation data
    await exportValidation(exportDir)

    // Print summary
    console.log('\n✅ Export complete!\n')
    console.log('📊 Summary:')
    console.log('─'.repeat(60))
    stats.forEach((stat) => {
      const status = stat.errors > 0 ? '⚠️ ' : '✅'
      console.log(
        `${status} ${stat.collection.padEnd(20)} ${stat.exported.toString().padStart(5)} / ${stat.count} records`,
      )
      if (stat.errors > 0) {
        console.log(`   ⚠️  ${stat.errors} errors encountered`)
      }
    })
    console.log('─'.repeat(60))
    console.log(`\n📁 Exported to: ${exportDir}`)
  } catch (error) {
    console.error('❌ Export failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function exportUsers(exportDir: string): Promise<void> {
  console.log('👥 Exporting Users...')

  const users = await prisma.user.findMany({
    where: {
      AND: [{ googleId: null }, { facebookId: null }],
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      name: true,
      isVolunteer: true,
      joinedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const exportData = users.map((user) => ({
    ...user,
    role: user.isVolunteer ? 'volunteer' : 'user',
  }))

  await fs.writeFile(path.join(exportDir, 'users.json'), JSON.stringify(exportData, null, 2))

  stats.push({
    collection: 'Users',
    count: users.length,
    exported: users.length,
    errors: 0,
  })

  console.log(`   ✅ Exported ${users.length} users`)
}

async function exportMedia(exportDir: string): Promise<void> {
  console.log('🖼️  Exporting Media...')

  const media = await prisma.media.findMany({
    select: {
      id: true,
      filename: true,
      path: true,
      mimeType: true,
      fileSize: true,
      width: true,
      height: true,
      altText: true,
      title: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  await fs.writeFile(path.join(exportDir, 'media.json'), JSON.stringify(media, null, 2))

  stats.push({
    collection: 'Media',
    count: media.length,
    exported: media.length,
    errors: 0,
  })

  console.log(`   ✅ Exported ${media.length} media files`)
}

async function exportCategories(exportDir: string): Promise<void> {
  console.log('📂 Exporting Categories (hierarchical)...')

  // Export categories in hierarchical order (parents before children)
  const allCategories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  // Build tree structure and flatten in breadth-first order
  const categoryMap = new Map(allCategories.map((cat) => [cat.id, cat]))
  const rootCategories = allCategories.filter((cat) => !cat.parentId)
  const orderedCategories: (typeof allCategories)[0][] = []

  const queue = [...rootCategories]
  while (queue.length > 0) {
    const current = queue.shift()!
    orderedCategories.push(current)

    // Add children to queue
    const children = allCategories.filter((cat) => cat.parentId === current.id)
    queue.push(...children)
  }

  // Check for orphaned categories
  const orphaned = allCategories.filter((cat) => {
    if (!cat.parentId) return false
    return !categoryMap.has(cat.parentId)
  })

  if (orphaned.length > 0) {
    console.log(`   ⚠️  Found ${orphaned.length} orphaned categories`)
    await fs.writeFile(
      path.join(exportDir, 'categories-orphaned.json'),
      JSON.stringify(orphaned, null, 2),
    )
  }

  await fs.writeFile(
    path.join(exportDir, 'categories.json'),
    JSON.stringify(orderedCategories, null, 2),
  )

  stats.push({
    collection: 'Categories',
    count: allCategories.length,
    exported: orderedCategories.length,
    errors: orphaned.length,
  })

  console.log(`   ✅ Exported ${orderedCategories.length} categories`)
  if (orphaned.length > 0) {
    console.log(`   ⚠️  ${orphaned.length} orphaned categories (exported separately)`)
  }
}

async function exportSubjects(exportDir: string): Promise<void> {
  console.log('🏷️  Exporting Subjects...')

  const subjects = await prisma.subject.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  await fs.writeFile(path.join(exportDir, 'subjects.json'), JSON.stringify(subjects, null, 2))

  stats.push({
    collection: 'Subjects',
    count: subjects.length,
    exported: subjects.length,
    errors: 0,
  })

  console.log(`   ✅ Exported ${subjects.length} subjects`)
}

async function exportSuppliers(exportDir: string): Promise<void> {
  console.log('🏪 Exporting Suppliers...')

  const suppliers = await prisma.supplier.findMany({
    select: {
      id: true,
      name: true,
      contactEmail: true,
      contactPhone: true,
      website: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      name: 'asc',
    },
  })

  await fs.writeFile(path.join(exportDir, 'suppliers.json'), JSON.stringify(suppliers, null, 2))

  stats.push({
    collection: 'Suppliers',
    count: suppliers.length,
    exported: suppliers.length,
    errors: 0,
  })

  console.log(`   ✅ Exported ${suppliers.length} suppliers`)
}

async function exportEvents(exportDir: string): Promise<void> {
  console.log('📅 Exporting Events...')

  const events = await prisma.event.findMany({
    where: {
      status: {
        in: ['UPCOMING', 'ONGOING', 'COMPLETED'],
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      eventType: true,
      startTime: true,
      endTime: true,
      location: true,
      maxAttendees: true,
      price: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      startTime: 'asc',
    },
  })

  await fs.writeFile(path.join(exportDir, 'events.json'), JSON.stringify(events, null, 2))

  stats.push({
    collection: 'Events',
    count: events.length,
    exported: events.length,
    errors: 0,
  })

  console.log(`   ✅ Exported ${events.length} events`)
}

async function exportBooks(exportDir: string): Promise<void> {
  console.log('📚 Exporting Books with relationships...')

  const books = await prisma.book.findMany({
    select: {
      id: true,
      isbn: true,
      oclcNumber: true,
      title: true,
      author: true,
      publisher: true,
      description: true,
      costPrice: true,
      sellPrice: true,
      memberPrice: true,
      currency: true,
      stockQuantity: true,
      reorderLevel: true,
      isDigital: true,
      downloadUrl: true,
      fileSize: true,
      coverImageUrl: true,
      coverImageId: true,
      categoryId: true,
      supplierId: true,
      subjects: {
        select: {
          subjectId: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  // Transform to include subject IDs as array
  const exportData = books.map((book) => ({
    ...book,
    subjectIds: book.subjects.map((s) => s.subjectId),
    subjects: undefined, // Remove nested structure
  }))

  // Check for orphaned relationships
  const categories = new Set((await prisma.category.findMany()).map((c) => c.id))
  const suppliers = new Set((await prisma.supplier.findMany()).map((s) => s.id))
  const media = new Set((await prisma.media.findMany()).map((m) => m.id))

  const orphanedBooks = exportData.filter((book) => {
    return (
      (book.categoryId && !categories.has(book.categoryId)) ||
      (book.supplierId && !suppliers.has(book.supplierId)) ||
      (book.coverImageId && !media.has(book.coverImageId))
    )
  })

  if (orphanedBooks.length > 0) {
    console.log(`   ⚠️  Found ${orphanedBooks.length} books with broken relationships`)
    await fs.writeFile(
      path.join(exportDir, 'books-orphaned.json'),
      JSON.stringify(orphanedBooks, null, 2),
    )
  }

  await fs.writeFile(path.join(exportDir, 'books.json'), JSON.stringify(exportData, null, 2))

  stats.push({
    collection: 'Books',
    count: books.length,
    exported: books.length,
    errors: orphanedBooks.length,
  })

  console.log(`   ✅ Exported ${books.length} books`)
  if (orphanedBooks.length > 0) {
    console.log(
      `   ⚠️  ${orphanedBooks.length} books with broken relationships (exported separately)`,
    )
  }
}

async function exportValidation(exportDir: string): Promise<void> {
  console.log('🔍 Generating validation report...')

  const validation = {
    exportDate: new Date().toISOString(),
    counts: {
      users: await prisma.user.count({
        where: { AND: [{ googleId: null }, { facebookId: null }] },
      }),
      books: await prisma.book.count(),
      categories: await prisma.category.count(),
      subjects: await prisma.subject.count(),
      suppliers: await prisma.supplier.count(),
      events: await prisma.event.count({
        where: { status: { in: ['UPCOMING', 'ONGOING', 'COMPLETED'] } },
      }),
      media: await prisma.media.count(),
      bookSubjects: await prisma.bookSubject.count(),
    },
    orphanedRecords: {
      booksWithoutCategory: await prisma.book.count({
        where: {
          categoryId: { not: null },
          category: null,
        },
      }),
      booksWithoutSupplier: await prisma.book.count({
        where: {
          supplierId: { not: null },
          supplier: null,
        },
      }),
      categoriesWithoutParent: await prisma.category.count({
        where: {
          parentId: { not: null },
          parent: null,
        },
      }),
      // Note: BookSubject orphans cascade delete, so we don't need to check them
    },
  }

  await fs.writeFile(path.join(exportDir, 'validation.json'), JSON.stringify(validation, null, 2))

  console.log('   ✅ Validation report generated')
  console.log('\n📊 Database Statistics:')
  console.log('─'.repeat(60))
  Object.entries(validation.counts).forEach(([key, count]) => {
    console.log(`   ${key.padEnd(20)} ${count.toString().padStart(5)}`)
  })

  const hasOrphans = Object.values(validation.orphanedRecords).some((count) => count > 0)
  if (hasOrphans) {
    console.log('\n⚠️  Orphaned Records Found:')
    console.log('─'.repeat(60))
    Object.entries(validation.orphanedRecords).forEach(([key, count]) => {
      if (count > 0) {
        console.log(`   ${key.padEnd(30)} ${count.toString().padStart(5)}`)
      }
    })
  }
}

// Run export
exportData().catch((error) => {
  console.error('Fatal error during export:', error)
  process.exit(1)
})
