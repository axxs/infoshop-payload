'use client'

import React, { useState, useEffect, useRef } from 'react'
import type { CartItem, BookSearchResult } from '../types'

interface POSSearchProps {
  onAddToCart: (item: CartItem) => void
}

/**
 * Product search component for POS interface
 * Features: debounced search, price type selection, stock status display
 */
export function POSSearch({ onAddToCart }: POSSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedPriceType, setSelectedPriceType] = useState<'RETAIL' | 'MEMBER'>('RETAIL')
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchError(null)
      return
    }

    // Minimum 2 characters for search
    if (searchQuery.trim().length < 2) {
      setSearchError('Please enter at least 2 characters to search')
      return
    }

    setIsSearching(true)
    setSearchError(null)

    try {
      const response = await fetch(
        `/api/books?where[or][0][title][contains]=${encodeURIComponent(searchQuery)}&where[or][1][isbn][contains]=${encodeURIComponent(searchQuery)}&where[or][2][author][contains]=${encodeURIComponent(searchQuery)}&limit=10`,
      )

      if (!response.ok) {
        throw new Error('Search failed. Please try again.')
      }

      const data = await response.json()
      setSearchResults(data.docs || [])
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed. Please try again.')
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Debounced search effect
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Don't search if query is empty
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchError(null)
      return
    }

    // Set new timer for debounced search (500ms delay)
    debounceTimerRef.current = setTimeout(() => {
      handleSearch()
    }, 500)

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [searchQuery])

  const handleManualSearch = () => {
    // Clear debounce timer and search immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    handleSearch()
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
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            placeholder="Type to search (min 2 characters)..."
            style={{
              flex: 1,
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
            }}
          />
          <button
            onClick={handleManualSearch}
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
        {searchError && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
            }}
          >
            {searchError}
          </div>
        )}
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
