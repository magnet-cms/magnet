import { Field, Prop, Schema } from '@magnet-cms/common'

/**
 * Column configuration within a view config.
 */
export interface ViewConfigColumn {
	/** Property name — must match the column ID in the DataTable */
	name: string
	/** Whether this column is visible */
	visible: boolean
	/** Sort order (0-based) */
	order: number
}

/**
 * Per-user, per-schema view configuration.
 *
 * Stores which columns are visible, their order, page size, and default sort
 * preferences for a user's content manager listing view.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class ViewConfig {
	/**
	 * The ID of the user who owns this config.
	 */
	@Field.Text({ required: true })
	userId!: string

	/**
	 * The schema name this config applies to (e.g., 'blog', 'page').
	 */
	@Field.Text({ required: true })
	schemaName!: string

	/**
	 * Column visibility and ordering configuration.
	 */
	@Prop({ type: Array, default: [] })
	columns!: ViewConfigColumn[]

	/**
	 * Number of rows to show per page.
	 */
	@Field.Number({ required: true, default: 10 })
	pageSize!: number

	/**
	 * Default sort field (property name).
	 */
	@Field.Text()
	sortField?: string

	/**
	 * Default sort direction.
	 */
	@Field.Text()
	sortDirection?: 'asc' | 'desc'

	/**
	 * When this config was last saved. Set server-side on every PUT.
	 * Used by the frontend hook to determine which data is newer (API vs localStorage).
	 */
	@Field.Date({ required: true, default: () => new Date() })
	updatedAt!: Date
}
