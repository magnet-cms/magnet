import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateTest9BE6F6D6Dto } from './dto/create-test9be6f6d6.dto'
import { Test9BE6F6D6 } from './test9be6f6d6.schema'

@Injectable()
export class Test9BE6F6D6Service {
	constructor(
		@InjectModel(Test9BE6F6D6)
		private model: Model<Test9BE6F6D6>,
	) {}

	create(dto: CreateTest9BE6F6D6Dto) {
		return this.model.create(dto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findById(id)
	}

	update(id: string, dto: CreateTest9BE6F6D6Dto) {
		return this.model.update(id, dto)
	}

	remove(id: string) {
		return this.model.delete(id)
	}
}
