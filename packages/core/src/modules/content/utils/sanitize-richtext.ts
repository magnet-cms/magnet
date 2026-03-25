import sanitizeHtml from 'sanitize-html'
import type { DiscoveryService } from '../../discovery/discovery.service'

/**
 * Allowed HTML tags for richtext fields.
 * Covers everything a typical rich text editor (e.g., Lexical) produces.
 */
const ALLOWED_TAGS = [
	'p',
	'br',
	'strong',
	'em',
	'u',
	's',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'ul',
	'ol',
	'li',
	'a',
	'img',
	'blockquote',
	'pre',
	'code',
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td',
	'span',
	'div',
	'sub',
	'sup',
	'hr',
]

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: ALLOWED_TAGS,
	allowedAttributes: {
		a: ['href', 'target'],
		img: ['src', 'alt', 'width', 'height'],
		span: ['class', 'style'],
		'*': ['class'],
	},
	// Only allow safe URL schemes — strips javascript: and data: hrefs
	allowedSchemes: ['http', 'https', 'mailto', 'ftp'],
	allowedSchemesByTag: {
		img: ['http', 'https', 'data'],
	},
}

/**
 * Sanitize HTML in richtext fields of a content data object.
 *
 * Looks up schema metadata via DiscoveryService to identify which fields
 * have type `richtext`, then runs sanitize-html on those fields to strip
 * dangerous content (XSS vectors) while preserving safe HTML.
 *
 * Non-richtext fields are returned unchanged.
 * If the schema is not found in discovery (internal schemas, etc.), data is
 * returned as-is without modification.
 *
 * @param schemaName - The content schema name
 * @param data - The content data object
 * @param discoveryService - Injected DiscoveryService for schema metadata lookup
 * @returns A new data object with richtext fields sanitized
 */
export function sanitizeRichTextFields<T extends Record<string, unknown>>(
	schemaName: string,
	data: T,
	discoveryService: DiscoveryService,
): T {
	const schema = discoveryService.getDiscoveredSchema(schemaName)

	if ('error' in schema) {
		return data
	}

	const richTextFieldNames = schema.properties
		.filter((prop) => prop.type === 'richtext')
		.map((prop) => prop.name)

	if (richTextFieldNames.length === 0) {
		return data
	}

	const sanitized: Record<string, unknown> = { ...data }
	for (const fieldName of richTextFieldNames) {
		const value = sanitized[fieldName]
		if (typeof value === 'string') {
			sanitized[fieldName] = sanitizeHtml(value, SANITIZE_OPTIONS)
		}
	}

	return sanitized as T
}
