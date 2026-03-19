/**
 * Naming utility functions for converting between different naming conventions.
 * Used across adapters for consistent field name transformations.
 */

/**
 * Convert camelCase to snake_case
 * @example
 * toSnakeCase('createdAt') // 'created_at'
 * toSnakeCase('userId') // 'user_id'
 */
export function toSnakeCase(str: string): string {
	// Handles consecutive capitals (e.g. tagID -> tag_id, userID -> user_id)
	return str
		.replace(/([a-z\d])([A-Z])/g, '$1_$2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
		.toLowerCase()
}

/**
 * Convert snake_case to camelCase
 * @example
 * toCamelCase('created_at') // 'createdAt'
 * toCamelCase('user_id') // 'userId'
 */
export function toCamelCase(str: string): string {
	return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * Convert PascalCase to kebab-case
 * @example
 * toKebabCase('MedicalRecord') // 'medical-record'
 * toKebabCase('UserProfile') // 'user-profile'
 */
export function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[^a-zA-Z0-9]/g, '-')
		.replace(/--+/g, '-')
		.toLowerCase()
}

/**
 * Convert kebab-case to PascalCase
 * @example
 * toPascalCase('medical-record') // 'MedicalRecord'
 * toPascalCase('user-profile') // 'UserProfile'
 */
export function toPascalCase(str: string): string {
	return str
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join('')
}
