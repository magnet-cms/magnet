export type TextNames = {
	name: string
	className: string
	propertyName: string
	constantName: string
	fileName: string
	title: string
	key: string
}

export const capitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1)

export const names = (str: string) => {
	const camelSeparated = str.replace(/([a-z])([A-Z])/g, '$1-$2')

	const name = camelSeparated
		.replace(/[^a-zA-Z0-9]/g, '-')
		.replace(/--+/g, '-')
		.toLowerCase()

	const className = capitalize(name)
	const propertyName = name.replace(/-(\w)/g, (_, w) => w.toUpperCase())
	const constantName = name.toUpperCase().replace(/-/g, '_')
	const fileName = name

	const title = name
		.split('-')
		.map((word) => capitalize(word))
		.join(' ')

	const key = name.replace(/-/g, '_').toLowerCase()

	return { name, className, propertyName, constantName, fileName, title, key }
}

/**
 * Simple pluralization for table names
 * Handles common irregular plurals used in CMS schemas
 */
export function pluralize(word: string): string {
	// Irregular plurals
	const irregulars: Record<string, string> = {
		media: 'media', // Media is already plural (or uncountable)
		history: 'histories',
		category: 'categories',
		entry: 'entries',
		story: 'stories',
		person: 'people',
		child: 'children',
	}

	if (irregulars[word]) {
		return irregulars[word]
	}

	// Words ending in 'y' preceded by consonant -> 'ies'
	if (/[^aeiou]y$/i.test(word)) {
		return `${word.slice(0, -1)}ies`
	}

	// Words ending in 's', 'x', 'z', 'ch', 'sh' -> add 'es'
	if (/(?:s|x|z|ch|sh)$/i.test(word)) {
		return `${word}es`
	}

	// Default: add 's'
	return `${word}s`
}

/**
 * Extract plain text from Lexical editor JSON format.
 * Recursively traverses the Lexical node tree to extract all text nodes.
 * @param lexicalJson - The Lexical JSON string or object
 * @param maxLength - Maximum length of extracted text (default: 100)
 * @returns Plain text extracted from the editor content
 */
export function extractTextFromLexical(
	lexicalJson: string | object | null | undefined,
	maxLength = 100,
): string {
	if (!lexicalJson) return ''

	// Parse JSON string if needed
	let parsed: any
	if (typeof lexicalJson === 'string') {
		try {
			parsed = JSON.parse(lexicalJson)
		} catch {
			// If parsing fails, return empty string
			return ''
		}
	} else {
		parsed = lexicalJson
	}

	// Recursively extract text from Lexical nodes
	const extractTextFromNode = (node: any): string[] => {
		const texts: string[] = []

		if (!node || typeof node !== 'object') return texts

		// If this is a text node, extract the text
		if (node.type === 'text' && node.text) {
			texts.push(node.text)
		}

		// Recursively process children
		if (Array.isArray(node.children)) {
			for (const child of node.children) {
				texts.push(...extractTextFromNode(child))
			}
		}

		return texts
	}

	// Extract text from root node
	const textParts = extractTextFromNode(parsed.root || parsed)
	const fullText = textParts.join(' ').trim()

	// Truncate if needed
	if (maxLength > 0 && fullText.length > maxLength) {
		return `${fullText.slice(0, maxLength)}...`
	}

	return fullText
}
