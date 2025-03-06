import { PLUGIN_METADATA } from '../constants'
import { PluginMetadata } from '../types'

export function Plugin(metadata: PluginMetadata): ClassDecorator {
	return (target: Function) => {
		Reflect.defineMetadata(PLUGIN_METADATA, metadata, target)
	}
}
