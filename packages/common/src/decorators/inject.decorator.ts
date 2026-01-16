import { Type } from '@nestjs/common'
import { INJECT_MODEL } from '~/constants'
import { detectDatabaseAdapter } from '~/utils'

export function InjectModel(model: Type): ParameterDecorator {
	return (target, propertyKey, parameterIndex) => {
		const adapter = detectDatabaseAdapter()

		if (propertyKey !== undefined) {
			Reflect.defineMetadata(INJECT_MODEL, model, target, propertyKey)
		}

		const { InjectModel } = require(`@magnet-cms/adapter-${adapter}`)
		return InjectModel(model)(target, propertyKey, parameterIndex)
	}
}
