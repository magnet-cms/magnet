import { Type } from '@nestjs/common'

import { INJECT_MODEL } from '~/constants'
import { detectDatabaseAdapter } from '~/utils'
import { requireDatabaseAdapterModule } from '~/utils/database-adapter-module.util'

export function InjectModel(model: Type): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const adapter = detectDatabaseAdapter()

    if (propertyKey !== undefined) {
      Reflect.defineMetadata(INJECT_MODEL, model, target, propertyKey)
    }

    const { InjectModel } = requireDatabaseAdapterModule(adapter) as {
      InjectModel: (model: Type<unknown>) => ParameterDecorator
    }
    return InjectModel(model)(target, propertyKey, parameterIndex)
  }
}
