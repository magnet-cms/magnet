import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateTest9FFD8D62Dto } from './dto/create-test9ffd8d62.dto'
import { Test9FFD8D62 } from './test9ffd8d62.schema'

@Injectable()
export class Test9FFD8D62Service {
	constructor(
		@InjectModel(Test9FFD8D62)
		private model: Model<Test9FFD8D62>,
	) {}

	create(dto: CreateTest9FFD8D62Dto) {
		return this.model.create(dto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findById(id)
	}

	update(id: string, dto: CreateTest9FFD8D62Dto) {
		return this.model.update(id, dto)
	}

	remove(id: string) {
		return this.model.delete(id)
	}
}
