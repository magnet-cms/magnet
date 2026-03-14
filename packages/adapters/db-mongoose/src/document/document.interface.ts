/**
 * Document status for the document-based i18n/versioning system
 */
export type DocumentStatus = 'draft' | 'published'

/**
 * Options for the document plugin
 */
export interface DocumentPluginOptions {
	/**
	 * Whether the schema uses internationalization (has intl fields)
	 */
	hasIntl: boolean
}

/**
 * Fields added by the document plugin
 */
export interface DocumentFields {
	documentId: string
	locale: string
	status: DocumentStatus
	publishedAt: Date | null
}
