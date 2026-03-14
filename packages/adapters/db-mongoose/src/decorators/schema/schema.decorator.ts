import { Schema as MongooseSchema } from '@nestjs/mongoose'

export function Schema(): ClassDecorator {
	return MongooseSchema()
}
