import { Field, Mixed, Prop, Schema } from '@magnet-cms/common'

/**
 * Media schema for storing file metadata.
 * This entity has a custom UI (Media Library) and doesn't use the standard content manager.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class Media {
	@Field.Text({ required: true, unique: true })
	filename!: string

	@Field.Text({ required: true })
	originalFilename!: string

	@Field.Text({ required: true })
	mimeType!: string

	@Field.Number({ required: true })
	size!: number

	@Field.Text({ required: true })
	path!: string

	@Field.Text({ required: true })
	url!: string

	@Field.Text()
	folder?: string

	@Field.Tags({ default: [] })
	tags?: string[]

	@Field.Text()
	alt?: string

	@Field.Number()
	width?: number

	@Field.Number()
	height?: number

	// Mixed type for arbitrary values - keep as @Prop
	@Prop({ type: Mixed })
	customFields?: Record<string, unknown>

	@Field.Date({ default: () => new Date() })
	createdAt!: Date

	@Field.Date({ default: () => new Date() })
	updatedAt!: Date

	@Field.Text()
	createdBy?: string
}
