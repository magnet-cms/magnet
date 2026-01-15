import { Prop, Setting, UI } from '@magnet/common'
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator'

export interface EnvironmentItem {
	id: string
	name: string
	connectionString: string
	description?: string
	isDefault: boolean
	isLocal?: boolean // true for env var environment (read-only)
}

@Setting()
export class EnvironmentSettings {
	@Prop({ required: true, default: [] })
	@IsArray()
	@UI({ type: 'array', label: 'Environments', tab: 'Main' })
	environments!: EnvironmentItem[]

	@Prop({ required: true, default: 'local' })
	@IsString()
	@UI({ type: 'text', label: 'Active Environment', side: true })
	activeEnvironment!: string

	@Prop({ required: false, default: true })
	@IsBoolean()
	@IsOptional()
	@UI({ type: 'checkbox', label: 'Use Local by Default', side: true })
	useLocalByDefault!: boolean
}
