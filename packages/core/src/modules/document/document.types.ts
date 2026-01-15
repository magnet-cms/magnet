/**
 * Document status types
 */
export type DocumentStatus = 'draft' | 'published'

/**
 * Base document fields that all documents will have
 */
export interface DocumentMetadata {
	documentId: string
	locale: string
	status: DocumentStatus
	publishedAt: Date | null
	createdAt: Date
	updatedAt: Date
	createdBy?: string
	updatedBy?: string
}

/**
 * A complete document with content and metadata
 */
export type Document<T = Record<string, any>> = T &
	DocumentMetadata & { id: string }

/**
 * Options for finding documents
 */
export interface FindDocumentOptions {
	locale?: string
	status?: DocumentStatus
}

/**
 * Options for listing documents
 */
export interface ListDocumentOptions extends FindDocumentOptions {
	limit?: number
	offset?: number
	sort?: Record<string, 1 | -1>
}

/**
 * Options for creating a document
 */
export interface CreateDocumentOptions {
	locale?: string
	createdBy?: string
}

/**
 * Options for updating a document
 */
export interface UpdateDocumentOptions {
	locale?: string
	status?: DocumentStatus
	updatedBy?: string
}

/**
 * Options for publishing a document
 */
export interface PublishDocumentOptions {
	locale?: string
	publishedBy?: string
}

/**
 * Result of listing documents grouped by documentId
 */
export interface DocumentGroup<T = Record<string, any>> {
	documentId: string
	locales: {
		[locale: string]: {
			draft?: Document<T>
			published?: Document<T>
		}
	}
}
