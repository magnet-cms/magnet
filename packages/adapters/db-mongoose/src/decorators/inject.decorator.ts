import { getModelToken } from '@magnet-cms/common'
import { Inject, Type } from '@nestjs/common'

export function InjectModel(schema: Type): ParameterDecorator {
	return Inject(getModelToken(schema))
}
