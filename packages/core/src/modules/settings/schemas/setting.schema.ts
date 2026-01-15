import { Mixed, Prop, Schema } from '@magnet/common'

@Schema({ versioning: false, i18n: false })
export class Setting {
	@Prop({ required: true, unique: true })
	key!: string

	@Prop({ type: Mixed, required: true })
	value!: any

	@Prop({ required: true })
	group!: string

	@Prop({ required: true })
	type!: string
}
