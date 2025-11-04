/**
 * Shopping Cart Type Definitions
 */

export interface CartItem {
  /** Book ID from Payload CMS */
  bookId: number

  /** Quantity of this book in cart */
  quantity: number

  /** Price captured when item was added (in dollars) */
  priceAtAdd: number

  /** Currency code (USD, EUR, GBP, AUD) */
  currency: string

  /** Whether member pricing was applied */
  isMemberPrice: boolean
}

export interface Cart {
  /** Cart items */
  items: CartItem[]

  /** When cart was created */
  createdAt: string

  /** When cart expires (7 days from creation) */
  expiresAt: string
}

export interface PopulatedCartItem extends CartItem {
  /** Book details from database */
  book: {
    id: number
    title: string
    author: string | null
    isbn: string | null
    externalCoverUrl: string | null
    stockQuantity: number
    sellPrice: number
    memberPrice: number
    currency: string
  }

  /** Current line total (quantity * priceAtAdd) */
  lineTotal: number
}

export interface PopulatedCart {
  items: PopulatedCartItem[]
  itemCount: number
  subtotal: number
  currency: string
  createdAt: string
  expiresAt: string
}

export type AddToCartResult =
  | { success: true; cart: PopulatedCart }
  | { success: false; error: string }

export type RemoveFromCartResult =
  | { success: true; cart: PopulatedCart }
  | { success: false; error: string }

export type UpdateQuantityResult =
  | { success: true; cart: PopulatedCart }
  | { success: false; error: string }

export type GetCartResult =
  | { success: true; cart: PopulatedCart }
  | { success: false; error: string }
