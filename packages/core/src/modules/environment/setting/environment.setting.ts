import { Prop, Setting, UI } from '@magnet/common'
import { IsArray } from 'class-validator'

export interface EnvironmentItem {
	id: string
	name: string
	connectionString: string
	description?: string
	isDefault: boolean
	isLocal?: boolean // true for env var environment (read-only)
}

@Setting()
export class Environments {
	@Prop({ required: false, default: [] })
	@IsArray()
	@UI({
		type: 'table',
		label: 'Environments',
		description: 'Configure database environments for your application',
		columns: [
			{ key: 'name', header: 'Name', type: 'text' },
			{ key: 'connectionString', header: 'Connection String', type: 'code' },
			{ key: 'description', header: 'Description', type: 'text' },
			{ key: 'isDefault', header: 'Default', type: 'status' },
		],
	})
	environments!: EnvironmentItem[]
}
