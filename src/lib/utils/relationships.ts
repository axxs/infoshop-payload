/**
 * Relationship utilities for extracting IDs from Payload relationship fields
 * @module lib/utils/relationships
 */

/**
 * Extracts the ID from a Payload relationship field
 *
 * Payload relationship fields can be:
 * - number (SQLite/Postgres ID)
 * - string (MongoDB ObjectId)
 * - object with id property (populated relationship)
 *
 * @param relation - The relationship field value
 * @param fieldName - Name of the field (for better error messages)
 * @returns The extracted ID
 * @throws Error if the relationship format is invalid
 *
 * @example
 * const bookId = getRelationshipId(data.book, 'book')
 * const userId = getRelationshipId(sale.customer, 'customer')
 */
export function getRelationshipId(
  relation: number | string | { id: number | string } | null | undefined,
  fieldName = 'relationship',
): number | string {
  // Handle null/undefined
  if (relation === null || relation === undefined) {
    throw new Error(`${fieldName} is required but was ${relation}`)
  }

  // Handle primitive IDs (number or string)
  if (typeof relation === 'number' || typeof relation === 'string') {
    return relation
  }

  // Handle populated relationships (object with id property)
  if (typeof relation === 'object' && 'id' in relation) {
    const id = relation.id
    if (typeof id === 'number' || typeof id === 'string') {
      return id
    }
    throw new Error(
      `${fieldName} object has invalid id type: ${typeof id}. Expected number or string.`,
    )
  }

  // Invalid format
  throw new Error(
    `${fieldName} has invalid format: ${typeof relation}. Expected number, string, or object with id property.`,
  )
}
