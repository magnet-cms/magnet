export function Hook(hookName: string): MethodDecorator {
	return (
		target: object,
		propertyKey: string | symbol,
		descriptor: PropertyDescriptor,
	) => {
		Reflect.defineMetadata('hook', { hookName }, descriptor.value)
		return descriptor
	}
}
