/**
 * POS Type Definitions
 */

export interface CartItem {
  bookId: string
  title: string
  author?: string
  isbn?: string
  quantity: number
  unitPrice: number
  priceType: 'RETAIL' | 'MEMBER' | 'CUSTOM'
  stockAvailable: number
  isDigital: boolean
}

export interface BookSearchResult {
  id: string
  title: string
  author?: string
  isbn?: string
  sellPrice: number
  memberPrice: number
  stockQuantity: number
  stockStatus: string
  isDigital: boolean
}

export type PaymentMethod = 'CASH' | 'CARD' | 'SQUARE' | 'MEMBER_CREDIT' | 'OTHER'
