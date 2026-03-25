import { Field, Mixed, Prop, Schema } from '@magnet-cms/common'

@Schema({ versioning: false, i18n: false })
export class History {
  @Field.Text({ required: true })
  documentId!: string

  @Field.Text({ required: true })
  versionId!: string

  @Field.Text({ required: true })
  schemaName!: string

  @Field.Text({ required: true, default: 'en' })
  locale!: string

  @Field.Number({ required: true, default: 1 })
  versionNumber!: number

  @Field.Select({
    required: true,
    default: 'draft',
    options: [
      { label: 'Draft', value: 'draft' },
      { label: 'Published', value: 'published' },
      { label: 'Archived', value: 'archived' },
    ],
  })
  status!: 'draft' | 'published' | 'archived'

  // Mixed type for arbitrary document data - keep as @Prop
  @Prop({ type: Mixed, required: true })
  data!: unknown

  @Field.Date({ required: true, default: () => new Date() })
  createdAt!: Date

  @Field.Text()
  createdBy?: string

  @Field.Text()
  notes?: string
}
