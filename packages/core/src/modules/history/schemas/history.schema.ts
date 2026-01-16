import { Mixed, Prop, Schema } from '@magnet-cms/common'

@Schema({ versioning: false, i18n: false })
export class History {
	@Prop({ required: true })
	documentId!: string

	@Prop({ required: true })
	versionId!: string

	@Prop({ required: true })
	schemaName!: string

	@Prop({ required: true, default: 'en' })
	locale!: string

	@Prop({ required: true, default: 1 })
	versionNumber!: number

	@Prop({ required: true, default: 'draft' as const })
	status!: 'draft' | 'published' | 'archived'

	@Prop({ type: Mixed, required: true })
	data!: any

	@Prop({ required: true, default: () => new Date() })
	createdAt!: Date

	@Prop()
	createdBy?: string

	@Prop()
	notes?: string
}
