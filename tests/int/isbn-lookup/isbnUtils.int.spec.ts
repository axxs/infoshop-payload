/**
 * Integration tests for ISBN validation and formatting utilities
 */

import { describe, test, expect } from 'vitest'
import { validateISBN, convertISBN10to13, formatISBN, cleanISBN } from '../../../src/lib/isbnUtils'

describe('cleanISBN', () => {
  test('removes hyphens from ISBN', () => {
    expect(cleanISBN('978-0-14-032872-1')).toBe('9780140328721')
  })

  test('removes spaces from ISBN', () => {
    expect(cleanISBN('978 0 14 032872 1')).toBe('9780140328721')
  })

  test('converts to uppercase', () => {
    expect(cleanISBN('014103287x')).toBe('014103287X')
  })

  test('handles mixed separators', () => {
    expect(cleanISBN('978-0 14-032872 1')).toBe('9780140328721')
  })
})

describe('validateISBN - ISBN-10', () => {
  test('validates correct ISBN-10 with numeric check digit', () => {
    const result = validateISBN('0141032871')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ISBN-10')
    expect(result.cleaned).toBe('0141032871')
    expect(result.error).toBeUndefined()
  })

  test('validates correct ISBN-10 with X check digit', () => {
    const result = validateISBN('043942089X')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ISBN-10')
    expect(result.cleaned).toBe('043942089X')
  })

  test('validates ISBN-10 with hyphens', () => {
    const result = validateISBN('0-14-103287-1')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ISBN-10')
    expect(result.cleaned).toBe('0141032871')
  })

  test('rejects ISBN-10 with invalid checksum', () => {
    const result = validateISBN('0141032870')
    expect(result.valid).toBe(false)
    expect(result.type).toBeNull()
    expect(result.error).toBe('Invalid ISBN-10 checksum')
  })

  test('rejects ISBN-10 with non-numeric characters (except X)', () => {
    const result = validateISBN('014A032871')
    expect(result.valid).toBe(false)
    expect(result.type).toBeNull()
  })
})

describe('validateISBN - ISBN-13', () => {
  test('validates correct ISBN-13', () => {
    const result = validateISBN('9780140328721')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ISBN-13')
    expect(result.cleaned).toBe('9780140328721')
    expect(result.error).toBeUndefined()
  })

  test('validates ISBN-13 with hyphens', () => {
    const result = validateISBN('978-0-14-032872-1')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ISBN-13')
    expect(result.cleaned).toBe('9780140328721')
  })

  test('rejects ISBN-13 with invalid checksum', () => {
    const result = validateISBN('9780140328720')
    expect(result.valid).toBe(false)
    expect(result.type).toBeNull()
    expect(result.error).toBe('Invalid ISBN-13 checksum')
  })

  test('rejects ISBN-13 with non-numeric characters', () => {
    const result = validateISBN('978014032872A')
    expect(result.valid).toBe(false)
    expect(result.type).toBeNull()
  })
})

describe('validateISBN - Edge Cases', () => {
  test('rejects empty string', () => {
    const result = validateISBN('')
    expect(result.valid).toBe(false)
    expect(result.type).toBeNull()
    expect(result.error).toContain('Invalid ISBN length')
  })

  test('rejects ISBN with wrong length', () => {
    const result = validateISBN('12345')
    expect(result.valid).toBe(false)
    expect(result.type).toBeNull()
    expect(result.error).toContain('Invalid ISBN length')
  })

  test('rejects 11-digit string', () => {
    const result = validateISBN('01410328711')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid ISBN length: 11')
  })

  test('rejects 12-digit string', () => {
    const result = validateISBN('978014032872')
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid ISBN length: 12')
  })
})

describe('convertISBN10to13', () => {
  test('converts valid ISBN-10 to ISBN-13', () => {
    const result = convertISBN10to13('0141032871')
    expect(result).toBe('9780141032870')
  })

  test('converts ISBN-10 with X check digit', () => {
    const result = convertISBN10to13('043942089X')
    expect(result).toBe('9780439420891')
  })

  test('handles ISBN-10 with hyphens', () => {
    const result = convertISBN10to13('0-14-103287-1')
    expect(result).toBe('9780141032870')
  })

  test('returns null for invalid length', () => {
    const result = convertISBN10to13('978014032872')
    expect(result).toBeNull()
  })

  test('returns null for ISBN-13', () => {
    const result = convertISBN10to13('9780140328721')
    expect(result).toBeNull()
  })
})

describe('formatISBN', () => {
  test('formats ISBN-10 with hyphens', () => {
    const result = formatISBN('0141032871')
    expect(result).toBe('0-1410-3287-1')
  })

  test('formats ISBN-13 with hyphens', () => {
    const result = formatISBN('9780140328721')
    expect(result).toBe('978-0-1403-2872-1')
  })

  test('handles already formatted ISBN-10', () => {
    const result = formatISBN('0-14-103287-1')
    expect(result).toBe('0-1410-3287-1')
  })

  test('handles already formatted ISBN-13', () => {
    const result = formatISBN('978-0-14-032872-1')
    expect(result).toBe('978-0-1403-2872-1')
  })

  test('returns unformatted for invalid length', () => {
    const result = formatISBN('12345')
    expect(result).toBe('12345')
  })
})

describe('ISBN Validation - Real World Examples', () => {
  test('validates Fantastic Mr. Fox ISBN-13', () => {
    const result = validateISBN('978-0-14-032872-1')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ISBN-13')
  })

  test('validates Harry Potter ISBN-10', () => {
    const result = validateISBN('0-439-42089-X')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ISBN-10')
  })

  test('validates The Hobbit ISBN-13', () => {
    const result = validateISBN('9780547928227')
    expect(result.valid).toBe(true)
    expect(result.type).toBe('ISBN-13')
  })
})
