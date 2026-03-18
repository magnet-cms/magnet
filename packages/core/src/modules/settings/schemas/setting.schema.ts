import {
	Field,
	Mixed,
	Prop,
	Schema,
	type SettingValue,
} from '@magnet-cms/common'

@Schema({
	versioning: false,
	i18n: false,
	// Compound unique: (group, key) — key alone is not unique across groups
	indexes: [{ keys: { group: 1, key: 1 }, unique: true }],
})
export class Setting {
	@Field.Text({ required: true })
	key!: string

	// Mixed type for arbitrary values - keep as @Prop
	@Prop({ type: Mixed, required: true })
	value!: SettingValue

	@Field.Text({ required: true })
	group!: string

	@Field.Text({ required: true })
	type!: string
}
