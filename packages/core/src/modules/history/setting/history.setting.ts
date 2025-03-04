import { Prop, Setting, UI } from '@magnet/common'

const draftOptions = [
	{ key: 'Enabled', value: 'true' },
	{ key: 'Disabled', value: 'false' },
]

const approvalOptions = [
	{ key: 'Required', value: 'true' },
	{ key: 'Not Required', value: 'false' },
]

const autoPublishOptions = [
	{ key: 'Enabled', value: 'true' },
	{ key: 'Disabled', value: 'false' },
]

@Setting()
export class Versioning {
	@UI({ tab: 'Versioning' })
	@Prop({ required: true, default: 10 })
	maxVersions!: number

	@UI({ tab: 'Versioning', type: 'select', options: draftOptions })
	@Prop({ required: true, default: 'true' })
	draftsEnabled!: string

	@UI({ tab: 'Versioning', type: 'select', options: approvalOptions })
	@Prop({ required: true, default: 'false' })
	requireApproval!: string

	@UI({ tab: 'Versioning', type: 'select', options: autoPublishOptions })
	@Prop({ required: true, default: 'false' })
	autoPublish!: string
}
