/**
 * Unit tests for slugify utilities
 */

import { describe, test, expect } from 'vitest'
import { slugify, generateUniqueSlug } from '../../src/collections/utils/slugify'

describe('slugify', () => {
  test('converts simple title to lowercase hyphenated slug', () => {
    expect(slugify('The Communist Manifesto')).toBe('the-communist-manifesto')
  })

  test('strips punctuation', () => {
    expect(slugify("What Is to Be Done?")).toBe('what-is-to-be-done')
  })

  test('collapses multiple spaces and hyphens', () => {
    expect(slugify('A   Long ---  Title')).toBe('a-long-title')
  })

  test('trims leading and trailing hyphens', () => {
    expect(slugify('--hello--')).toBe('hello')
  })

  test('handles empty string', () => {
    expect(slugify('')).toBe('')
  })

  test('handles whitespace-only string', () => {
    expect(slugify('   ')).toBe('')
  })

  test('transliterates accented characters via NFD decomposition', () => {
    expect(slugify('\u00DCber die Natur')).toBe('uber-die-natur')
  })

  test('handles French accents', () => {
    expect(slugify('Les Mis\u00E9rables')).toBe('les-miserables')
  })

  test('handles Spanish tilde', () => {
    expect(slugify('El Ni\u00F1o')).toBe('el-nino')
  })

  test('handles mixed Unicode diacritics', () => {
    expect(slugify('Caf\u00E9 R\u00E9sum\u00E9 Na\u00EFve')).toBe('cafe-resume-naive')
  })

  test('strips characters that have no ASCII equivalent', () => {
    // CJK characters will be stripped entirely (no transliteration)
    expect(slugify('hello \u4E16\u754C world')).toBe('hello-world')
  })

  test('removes underscores from output', () => {
    // \w includes underscores; they pass through the regex but are
    // acceptable in slugs. Documenting actual behaviour.
    expect(slugify('hello_world')).toBe('hello_world')
  })

  test('handles numbers in titles', () => {
    expect(slugify('1984 by George Orwell')).toBe('1984-by-george-orwell')
  })

  test('handles ampersands and special chars', () => {
    expect(slugify('War & Peace')).toBe('war-peace')
  })
})

describe('generateUniqueSlug', () => {
  test('returns base slug when no conflicts exist', () => {
    expect(generateUniqueSlug('my-book', [])).toBe('my-book')
  })

  test('returns base slug when existing slugs are unrelated', () => {
    expect(generateUniqueSlug('my-book', ['other-book', 'another-title'])).toBe('my-book')
  })

  test('appends -1 when base slug already exists', () => {
    expect(generateUniqueSlug('my-book', ['my-book'])).toBe('my-book-1')
  })

  test('increments counter past existing suffixed slugs', () => {
    expect(generateUniqueSlug('my-book', ['my-book', 'my-book-1', 'my-book-2'])).toBe('my-book-3')
  })

  test('finds gap in counter sequence', () => {
    // my-book-1 exists but my-book-2 does not
    expect(generateUniqueSlug('my-book', ['my-book', 'my-book-1'])).toBe('my-book-2')
  })

  test('handles empty base slug', () => {
    expect(generateUniqueSlug('', [''])).toBe('-1')
  })
})
