import { PropOptions } from '@magnet-cms/common'

const DRIZZLE_PROPS_KEY = 'drizzle:props'

/**
 * Drizzle-specific Prop decorator.
 * Stores property metadata that will be used to generate Drizzle column definitions.
 *
 * This is called by the common @Prop() decorator after detecting
 * that Drizzle is the active database adapter.
 */
export function Prop(options?: PropOptions): PropertyDecorator {
	return (target: object, propertyKey: string | symbol) => {
		const existingProps: Map<string | symbol, PropOptions> =
			Reflect.getMetadata(DRIZZLE_PROPS_KEY, target.constructor) || new Map()

		existingProps.set(propertyKey, {
			...options,
			type:
				options?.type ||
				Reflect.getMetadata('design:type', target, propertyKey),
		})

		Reflect.defineMetadata(DRIZZLE_PROPS_KEY, existingProps, target.constructor)
	}
}

/**
 * Get Drizzle property metadata from a class
 */
export function getDrizzlePropsMetadata(
	target: Function,
): Map<string | symbol, PropOptions> {
	return Reflect.getMetadata(DRIZZLE_PROPS_KEY, target) || new Map()
}
