import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateTest0153F022Dto } from './dto/create-test0153f022.dto'
import { Test0153F022 } from './test0153f022.schema'

@Injectable()
export class Test0153F022Service {
	constructor(
		@InjectModel(Test0153F022)
		private model: Model<Test0153F022>,
	) {}

	create(dto: CreateTest0153F022Dto) {
		return this.model.create(dto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findById(id)
	}

	update(id: string, dto: CreateTest0153F022Dto) {
		return this.model.update(id, dto)
	}

	remove(id: string) {
		return this.model.delete(id)
	}
}
