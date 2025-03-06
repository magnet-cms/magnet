import { Type } from '@nestjs/common'

export interface PluginMetadata {
	name: string
	description?: string
	version?: string
}

export interface PluginOptions {
	plugins: Type[]
}

export interface PluginHook {
	instance: any
	methodName: string | symbol
}
