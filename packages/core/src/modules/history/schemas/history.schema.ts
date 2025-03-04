import { Mixed, Prop, Schema } from '@magnet/common'

@Schema()
export class History {
	@Prop({ required: true })
	documentId!: string

	@Prop({ required: true })
	versionId!: string

	@Prop({ required: true })
	collection!: string

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
