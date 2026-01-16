import { Mixed, Prop, Schema } from '@magnet/common'

/**
 * Media schema for storing file metadata.
 * This entity has a custom UI (Media Library) and doesn't use the standard content manager.
 */
@Schema({ versioning: false, i18n: false })
export class Media {
	@Prop({ required: true, unique: true })
	filename!: string

	@Prop({ required: true })
	originalFilename!: string

	@Prop({ required: true })
	mimeType!: string

	@Prop({ required: true })
	size!: number

	@Prop({ required: true })
	path!: string

	@Prop({ required: true })
	url!: string

	@Prop()
	folder?: string

	@Prop({ type: [String], default: [] })
	tags?: string[]

	@Prop()
	alt?: string

	@Prop()
	width?: number

	@Prop()
	height?: number

	@Prop({ type: Mixed })
	customFields?: Record<string, unknown>

	@Prop({ default: () => new Date() })
	createdAt!: Date

	@Prop({ default: () => new Date() })
	updatedAt!: Date

	@Prop()
	createdBy?: string
}
