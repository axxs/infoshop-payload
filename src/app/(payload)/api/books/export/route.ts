/**
 * Books Export Endpoint
 * GET /api/books/export
 *
 * Exports books as JSON or CSV with optional filtering
 *
 * Query parameters:
 * - format: 'json' | 'csv' (default: 'json')
 * - category: Category slug to filter by
 * - subject: Subject slug to filter by
 * - stockStatus: Comma-separated list of stock statuses (IN_STOCK,LOW_STOCK,OUT_OF_STOCK,DISCONTINUED)
 * - search: Search query for title, author, or ISBN
 * - depth: 0 for IDs only, 1 for expanded relations (default: 1)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import type { Where } from 'payload'
import config from '@payload-config'
import Papa from 'papaparse'
import type { Book } from '@/payload-types'

export async function GET(request: NextRequest) {
  try {
    const payload = await getPayload({ config })

    // Authentication check - only authenticated users can export books
    const { user } = await payload.auth({ headers: request.headers })
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const format = searchParams.get('format') || 'json'
    const category = searchParams.get('category')
    const subject = searchParams.get('subject')
    const stockStatus = searchParams.get('stockStatus')
    const search = searchParams.get('search')
    const depth = parseInt(searchParams.get('depth') || '1', 10)

    // Build query
    const where: Where = {}
    const conditions: Where[] = []

    // Filter by category
    if (category) {
      const categoryDoc = await payload.find({
        collection: 'categories',
        where: { slug: { equals: category } },
        limit: 1,
      })
      if (categoryDoc.docs.length > 0) {
        conditions.push({
          categories: { contains: categoryDoc.docs[0].id },
        })
      }
    }

    // Filter by subject
    if (subject) {
      const subjectDoc = await payload.find({
        collection: 'subjects',
        where: { slug: { equals: subject } },
        limit: 1,
      })
      if (subjectDoc.docs.length > 0) {
        conditions.push({
          subjects: { contains: subjectDoc.docs[0].id },
        })
      }
    }

    // Filter by stock status
    if (stockStatus) {
      const statuses = stockStatus.split(',').map((s) => s.trim())
      conditions.push({
        stockStatus: { in: statuses },
      })
    }

    // Search filter
    if (search) {
      conditions.push({
        or: [
          { title: { contains: search } },
          { author: { contains: search } },
          { isbn: { contains: search } },
        ],
      })
    }

    // Combine conditions
    if (conditions.length > 0) {
      where.and = conditions
    }

    // Fetch all matching books
    const allBooks: Book[] = []
    let page = 1
    const limit = 100
    let hasMore = true

    while (hasMore) {
      const result = await payload.find({
        collection: 'books',
        where,
        limit,
        page,
        depth: Math.min(depth, 2), // Cap depth at 2 for performance
        sort: 'title',
      })

      allBooks.push(...result.docs)

      if (result.docs.length < limit || allBooks.length >= result.totalDocs) {
        hasMore = false
      } else {
        page++
      }
    }

    // Format response based on requested format
    if (format === 'csv') {
      const csvData = allBooks.map((book) => ({
        title: book.title,
        author: book.author,
        isbn: book.isbn || '',
        oclcNumber: book.oclcNumber || '',
        publisher: book.publisher || '',
        publishedDate: book.publishedDate || '',
        synopsis: book.synopsis || '',
        costPrice: book.costPrice ?? '',
        sellPrice: book.sellPrice ?? '',
        memberPrice: book.memberPrice ?? '',
        currency: book.currency,
        stockQuantity: book.stockQuantity,
        reorderLevel: book.reorderLevel ?? 5,
        stockStatus: book.stockStatus,
        categoryName: getCategoryName(book),
        subjectNames: getSubjectNames(book),
        coverImageUrl: getCoverImageUrl(book),
        isDigital: book.isDigital ? 'true' : 'false',
      }))

      const csv = Papa.unparse(csvData)

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="books-export-${Date.now()}.csv"`,
        },
      })
    }

    // JSON format (default)
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalBooks: allBooks.length,
      filters: {
        category: category || null,
        subject: subject || null,
        stockStatus: stockStatus || null,
        search: search || null,
      },
      books: allBooks.map((book) => formatBookForExport(book, depth)),
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="books-export-${Date.now()}.json"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export books',
      },
      { status: 500 },
    )
  }
}

/**
 * Formats a book for JSON export based on depth
 */
function formatBookForExport(book: Book, depth: number) {
  const base = {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    oclcNumber: book.oclcNumber,
    publisher: book.publisher,
    publishedDate: book.publishedDate,
    synopsis: book.synopsis,
    costPrice: book.costPrice,
    sellPrice: book.sellPrice,
    memberPrice: book.memberPrice,
    currency: book.currency,
    stockQuantity: book.stockQuantity,
    reorderLevel: book.reorderLevel,
    stockStatus: book.stockStatus,
    isDigital: book.isDigital,
    featured: book.featured,
    format: book.format,
    pages: book.pages,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  }

  if (depth === 0) {
    return {
      ...base,
      categories: book.categories,
      subjects: book.subjects,
      coverImage: typeof book.coverImage === 'object' ? book.coverImage?.id : book.coverImage,
    }
  }

  // Depth 1+: include expanded relations
  return {
    ...base,
    categories:
      Array.isArray(book.categories) && book.categories.length > 0
        ? book.categories.map((cat) =>
            typeof cat === 'object' ? { id: cat.id, name: cat.name, slug: cat.slug } : cat,
          )
        : [],
    subjects:
      Array.isArray(book.subjects) && book.subjects.length > 0
        ? book.subjects.map((sub) =>
            typeof sub === 'object' ? { id: sub.id, name: sub.name, slug: sub.slug } : sub,
          )
        : [],
    coverImage:
      typeof book.coverImage === 'object' && book.coverImage
        ? { id: book.coverImage.id, url: book.coverImage.url, alt: book.coverImage.alt }
        : null,
    externalCoverUrl: book.externalCoverUrl,
  }
}

/**
 * Gets category name from book for CSV export
 */
function getCategoryName(book: Book): string {
  if (!book.categories || !Array.isArray(book.categories) || book.categories.length === 0) {
    return ''
  }
  const firstCat = book.categories[0]
  return typeof firstCat === 'object' ? firstCat.name : ''
}

/**
 * Gets subject names from book for CSV export
 */
function getSubjectNames(book: Book): string {
  if (!book.subjects || !Array.isArray(book.subjects) || book.subjects.length === 0) {
    return ''
  }
  return book.subjects
    .map((sub) => (typeof sub === 'object' ? sub.name : ''))
    .filter(Boolean)
    .join(',')
}

/**
 * Gets cover image URL from book for CSV export
 */
function getCoverImageUrl(book: Book): string {
  if (typeof book.coverImage === 'object' && book.coverImage?.url) {
    return book.coverImage.url
  }
  return book.externalCoverUrl || ''
}
