import { PROP_METADATA_KEY } from '~/constants'
import { PropOptions } from '~/types'
import { detectDatabaseAdapter } from '~/utils'

export function Prop(options?: PropOptions): PropertyDecorator {
	return (target: object, propertyKey: string | symbol) => {
		const adapter = detectDatabaseAdapter()

		const existingProps = Reflect.getMetadata(PROP_METADATA_KEY, target) || []
		Reflect.defineMetadata(
			PROP_METADATA_KEY,
			[...existingProps, { propertyKey, options }],
			target,
		)

		const { Prop } = require(`@magnet-cms/adapter-${adapter}`)
		return Prop(options)(target, propertyKey)
	}
}
