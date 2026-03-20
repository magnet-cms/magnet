import { Inject } from '@nestjs/common'
import { getPluginOptionsToken } from '../constants'

/**
 * Decorator to inject plugin options using standardized token.
 *
 * @param pluginName - The plugin name (e.g., 'playground')
 *
 * @example
 * ```ts
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @InjectPluginOptions('playground')
 *     private readonly options: PlaygroundPluginOptions
 *   ) {}
 * }
 * ```
 */
export function InjectPluginOptions(pluginName: string): ParameterDecorator {
	return Inject(getPluginOptionsToken(pluginName))
}
