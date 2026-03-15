import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateTest17002FCDDto } from './dto/create-test17002fcd.dto'
import { Test17002FCD } from './test17002fcd.schema'

@Injectable()
export class Test17002FCDService {
	constructor(
		@InjectModel(Test17002FCD)
		private model: Model<Test17002FCD>,
	) {}

	create(dto: CreateTest17002FCDDto) {
		return this.model.create(dto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findById(id)
	}

	update(id: string, dto: CreateTest17002FCDDto) {
		return this.model.update(id, dto)
	}

	remove(id: string) {
		return this.model.delete(id)
	}
}
