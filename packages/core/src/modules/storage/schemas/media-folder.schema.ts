import { Field, Schema } from '@magnet-cms/common'

/**
 * MediaFolder schema for persistent folder storage.
 * Folders are first-class entities that persist even when empty.
 */
@Schema({ versioning: false, i18n: false, visible: false })
export class MediaFolder {
  @Field.Text({ required: true })
  name!: string

  @Field.Text({ required: true, unique: true })
  path!: string

  @Field.Text()
  parentPath?: string

  @Field.Text()
  createdBy?: string

  @Field.Text()
  createdByName?: string

  @Field.Date({ default: () => new Date() })
  createdAt!: Date

  @Field.Text()
  ownerId?: string

  @Field.Boolean({ default: false })
  isPrivate?: boolean
}
