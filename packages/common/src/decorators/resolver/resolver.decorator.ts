import { RESOLVER_METADATA_KEY } from '~/constants'
import { ResolverInput, ResolverOptions } from '~/types'

export function Resolver(optionsOrFn: ResolverInput): ClassDecorator {
  return (target) => {
    let resolvedOptions: ResolverOptions

    if (typeof optionsOrFn === 'function') {
      resolvedOptions = { schema: optionsOrFn() }
    } else {
      if (!optionsOrFn.schema) {
        throw new Error(`@Resolver object input must include a 'schema' property.`)
      }
      resolvedOptions = optionsOrFn
    }

    Reflect.defineMetadata(RESOLVER_METADATA_KEY, resolvedOptions, target)
  }
}
