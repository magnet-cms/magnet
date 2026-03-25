import { PROP_METADATA_KEY } from '~/constants'
import { PropOptions } from '~/types'
import { detectDatabaseAdapter } from '~/utils'
import { requireDatabaseAdapterModule } from '~/utils/database-adapter-module.util'

export function Prop(options?: PropOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const adapter = detectDatabaseAdapter()

    const existingProps = Reflect.getMetadata(PROP_METADATA_KEY, target) || []
    Reflect.defineMetadata(PROP_METADATA_KEY, [...existingProps, { propertyKey, options }], target)

    const { Prop } = requireDatabaseAdapterModule(adapter) as {
      Prop: (options?: PropOptions) => PropertyDecorator
    }
    return Prop(options)(target, propertyKey)
  }
}
