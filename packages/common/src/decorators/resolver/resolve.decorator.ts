import { RESOLVE_METADATA_KEY } from '~/constants'
import { ResolveInput, ResolveOptions } from '~/types'

export function Resolve(optionsOrFn: ResolveInput): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const controller = target.constructor

    let resolvedOptions: ResolveOptions

    if (typeof optionsOrFn === 'function') {
      const resolvedType = optionsOrFn()
      resolvedOptions = { type: resolvedType, isArray: false }
    } else if (Array.isArray(optionsOrFn)) {
      if (!optionsOrFn.every((fn) => typeof fn === 'function')) {
        throw new Error('@Resolve array input must only contain functions.')
      }
      resolvedOptions = {
        type: optionsOrFn.map((fn) => fn()),
        isArray: true,
      }
    } else {
      if (!optionsOrFn || !optionsOrFn.type) {
        throw new Error(`@Resolve object input must include a 'type' property.`)
      }
      resolvedOptions = {
        ...optionsOrFn,
        isArray: Array.isArray(optionsOrFn.type),
      }
    }

    if (!descriptor.value) {
      throw new Error(`@Resolve must be used within a method. Class: ${controller.name}`)
    }

    Reflect.defineMetadata(RESOLVE_METADATA_KEY, resolvedOptions, descriptor.value)
  }
}
