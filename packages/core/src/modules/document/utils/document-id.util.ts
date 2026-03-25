import { randomBytes } from 'node:crypto'

/**
 * Characters used for document ID generation (alphanumeric)
 */
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'

/**
 * Default length for document IDs (24 characters like Strapi)
 */
const DEFAULT_LENGTH = 24

/**
 * Generate a cryptographically secure random document ID
 * @param length The length of the ID to generate (default: 24)
 * @returns A random alphanumeric string
 */
export function generateDocumentId(length: number = DEFAULT_LENGTH): string {
  const bytes = randomBytes(length)
  let result = ''

  for (let i = 0; i < length; i++) {
    const byte = bytes[i]
    if (byte !== undefined) {
      result += ALPHABET[byte % ALPHABET.length]
    }
  }

  return result
}

/**
 * Validate that a string is a valid document ID format
 * @param id The ID to validate
 * @returns True if the ID is valid
 */
export function isValidDocumentId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  if (id.length !== DEFAULT_LENGTH) return false

  // Check that all characters are in the alphabet
  for (const char of id) {
    if (!ALPHABET.includes(char)) return false
  }

  return true
}
