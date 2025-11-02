'use client'

import React, { useState } from 'react'
import type { CartItem, BookSearchResult } from '../types'

interface POSSearchProps {
  onAddToCart: (item: CartItem) => void
}

export function POSSearch({ onAddToCart }: POSSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedPriceType, setSelectedPriceType] = useState<'RETAIL' | 'MEMBER'>('RETAIL')

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const response = await fetch(
        `/api/books?where[or][0][title][contains]=${encodeURIComponent(searchQuery)}&where[or][1][isbn][contains]=${encodeURIComponent(searchQuery)}&where[or][2][author][contains]=${encodeURIComponent(searchQuery)}&limit=10`,
      )
      const data = await response.json()

      setSearchResults(data.docs || [])
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddToCart = (book: BookSearchResult) => {
    const unitPrice = selectedPriceType === 'MEMBER' ? book.memberPrice : book.sellPrice

    const cartItem: CartItem = {
      bookId: book.id,
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      quantity: 1,
      unitPrice,
      priceType: selectedPriceType,
      stockAvailable: book.stockQuantity,
      isDigital: book.isDigital,
    }

    onAddToCart(cartItem)
  }

  const getStockBadge = (book: BookSearchResult) => {
    if (book.isDigital) {
      return <span style={{ color: '#059669', fontSize: '0.875rem' }}>Digital</span>
    }

    if (book.stockStatus === 'OUT_OF_STOCK') {
      return <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>Out of Stock</span>
    }

    if (book.stockStatus === 'LOW_STOCK') {
      return (
        <span style={{ color: '#d97706', fontSize: '0.875rem' }}>
          Low Stock ({book.stockQuantity})
        </span>
      )
    }

    return (
      <span style={{ color: '#059669', fontSize: '0.875rem' }}>
        In Stock ({book.stockQuantity})
      </span>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
        Product Search
      </h2>

      {/* Price Type Toggle */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          Price Type
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setSelectedPriceType('RETAIL')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: selectedPriceType === 'RETAIL' ? '#3b82f6' : 'white',
              color: selectedPriceType === 'RETAIL' ? 'white' : 'black',
              cursor: 'pointer',
            }}
          >
            Retail Price
          </button>
          <button
            onClick={() => setSelectedPriceType('MEMBER')}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              backgroundColor: selectedPriceType === 'MEMBER' ? '#3b82f6' : 'white',
              color: selectedPriceType === 'MEMBER' ? 'white' : 'black',
              cursor: 'pointer',
            }}
          >
            Member Price
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          htmlFor="search"
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}
        >
          Search by Title, ISBN, or Author
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            id="search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Type to search..."
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
            }}
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: isSearching ? 'not-allowed' : 'pointer',
              opacity: isSearching ? 0.6 : 1,
            }}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      <div style={{ border: '1px solid #d1d5db', borderRadius: '0.5rem', overflow: 'hidden' }}>
        {searchResults.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
            {searchQuery ? 'No results found' : 'Enter a search query to find products'}
          </div>
        ) : (
          <div>
            {searchResults.map((book) => (
              <div
                key={book.id}
                style={{
                  padding: '1rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{book.title}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    {book.author && <span>by {book.author}</span>}
                    {book.isbn && <span> • ISBN: {book.isbn}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600' }}>
                      ${selectedPriceType === 'MEMBER' ? book.memberPrice : book.sellPrice}
                    </span>
                    {getStockBadge(book)}
                  </div>
                </div>
                <button
                  onClick={() => handleAddToCart(book)}
                  disabled={book.stockStatus === 'OUT_OF_STOCK' && !book.isDigital}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor:
                      book.stockStatus === 'OUT_OF_STOCK' && !book.isDigital
                        ? '#9ca3af'
                        : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor:
                      book.stockStatus === 'OUT_OF_STOCK' && !book.isDigital
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  Add to Cart
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
