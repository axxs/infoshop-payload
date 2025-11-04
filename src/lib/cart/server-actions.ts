/**
 * Shopping Cart Server Actions
 * Next.js Server Actions for cart management
 */

'use server'

import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import type {
  AddToCartResult,
  RemoveFromCartResult,
  UpdateQuantityResult,
  GetCartResult,
  PopulatedCart,
  PopulatedCartItem,
} from './types'
import { getCartFromCookies, saveCartToCookies, clearCartCookie } from './cookies'
import { validateQuantityAgainstStock, createEmptyCart } from './validation'

/**
 * Populate cart with book details from database
 */
async function populateCart(): Promise<PopulatedCart> {
  const cart = await getCartFromCookies()
  const payload = await getPayload({ config })

  // If no items, return empty populated cart
  if (cart.items.length === 0) {
    return {
      items: [],
      itemCount: 0,
      subtotal: 0,
      currency: 'AUD',
      createdAt: cart.createdAt,
      expiresAt: cart.expiresAt,
    }
  }

  // Fetch all books in cart
  const bookIds = cart.items.map((item) => item.bookId)
  const { docs: books } = await payload.find({
    collection: 'books',
    where: {
      id: {
        in: bookIds,
      },
    },
    limit: bookIds.length,
  })

  // Create lookup map
  const bookMap = new Map(books.map((book) => [book.id, book]))

  // Populate cart items
  const populatedItems: PopulatedCartItem[] = []
  let subtotal = 0
  let currency = 'AUD'

  for (const item of cart.items) {
    const book = bookMap.get(item.bookId)

    // Skip if book no longer exists
    if (!book) continue

    const lineTotal = item.quantity * item.priceAtAdd
    subtotal += lineTotal

    // Use first item's currency
    if (populatedItems.length === 0) {
      currency = item.currency
    }

    populatedItems.push({
      ...item,
      book: {
        id: book.id,
        title: book.title,
        author: book.author || null,
        isbn: book.isbn || null,
        externalCoverUrl: book.externalCoverUrl || null,
        stockQuantity: book.stockQuantity,
        sellPrice: Number(book.sellPrice),
        memberPrice: Number(book.memberPrice),
        currency: book.currency,
      },
      lineTotal,
    })
  }

  return {
    items: populatedItems,
    itemCount: populatedItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal,
    currency,
    createdAt: cart.createdAt,
    expiresAt: cart.expiresAt,
  }
}

/**
 * Get current cart with populated book details
 */
export async function getCart(): Promise<GetCartResult> {
  try {
    const cart = await populateCart()
    return { success: true, cart }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get cart'
    return { success: false, error: message }
  }
}

/**
 * Add item to cart or update quantity if already exists
 */
export async function addToCart(
  bookId: number,
  quantity: number = 1,
  isMemberPrice: boolean = false,
): Promise<AddToCartResult> {
  try {
    const payload = await getPayload({ config })

    // Fetch book details
    const book = await payload.findByID({
      collection: 'books',
      id: bookId,
    })

    if (!book) {
      return { success: false, error: 'Book not found' }
    }

    // Get current cart
    const cart = await getCartFromCookies()

    // Check if item already in cart
    const existingItemIndex = cart.items.findIndex((item) => item.bookId === bookId)

    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      const existingItem = cart.items[existingItemIndex]
      const newQuantity = existingItem.quantity + quantity

      // Validate against stock
      const stockValidation = validateQuantityAgainstStock(newQuantity, book.stockQuantity)
      if (!stockValidation.valid) {
        return { success: false, error: stockValidation.error || 'Invalid quantity' }
      }

      cart.items[existingItemIndex].quantity = newQuantity
    } else {
      // Add new item
      // Validate against stock
      const stockValidation = validateQuantityAgainstStock(quantity, book.stockQuantity)
      if (!stockValidation.valid) {
        return { success: false, error: stockValidation.error || 'Invalid quantity' }
      }

      // Determine price (member or sell)
      const price = isMemberPrice ? Number(book.memberPrice) : Number(book.sellPrice)

      cart.items.push({
        bookId: book.id,
        quantity,
        priceAtAdd: price,
        currency: book.currency,
        isMemberPrice,
      })
    }

    // Save cart
    await saveCartToCookies(cart)

    // Revalidate cart page
    revalidatePath('/cart')

    // Return populated cart
    const populatedCart = await populateCart()
    return { success: true, cart: populatedCart }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add to cart'
    return { success: false, error: message }
  }
}

/**
 * Update quantity of item in cart
 */
export async function updateQuantity(
  bookId: number,
  quantity: number,
): Promise<UpdateQuantityResult> {
  try {
    if (quantity < 1) {
      return { success: false, error: 'Quantity must be at least 1' }
    }

    const payload = await getPayload({ config })

    // Fetch book details for stock validation
    const book = await payload.findByID({
      collection: 'books',
      id: bookId,
    })

    if (!book) {
      return { success: false, error: 'Book not found' }
    }

    // Validate against stock
    const stockValidation = validateQuantityAgainstStock(quantity, book.stockQuantity)
    if (!stockValidation.valid) {
      return { success: false, error: stockValidation.error || 'Invalid quantity' }
    }

    // Get current cart
    const cart = await getCartFromCookies()

    // Find item in cart
    const itemIndex = cart.items.findIndex((item) => item.bookId === bookId)

    if (itemIndex < 0) {
      return { success: false, error: 'Item not found in cart' }
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity

    // Save cart
    await saveCartToCookies(cart)

    // Revalidate cart page
    revalidatePath('/cart')

    // Return populated cart
    const populatedCart = await populateCart()
    return { success: true, cart: populatedCart }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update quantity'
    return { success: false, error: message }
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(bookId: number): Promise<RemoveFromCartResult> {
  try {
    const cart = await getCartFromCookies()

    // Filter out the item
    cart.items = cart.items.filter((item) => item.bookId !== bookId)

    // Save cart
    await saveCartToCookies(cart)

    // Revalidate cart page
    revalidatePath('/cart')

    // Return populated cart
    const populatedCart = await populateCart()
    return { success: true, cart: populatedCart }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove from cart'
    return { success: false, error: message }
  }
}

/**
 * Clear entire cart
 */
export async function clearCart(): Promise<void> {
  await clearCartCookie()
  revalidatePath('/cart')
}

/**
 * Get cart item count (for header badge)
 */
export async function getCartItemCount(): Promise<number> {
  try {
    const cart = await getCartFromCookies()
    return cart.items.reduce((sum, item) => sum + item.quantity, 0)
  } catch (_error) {
    return 0
  }
}
