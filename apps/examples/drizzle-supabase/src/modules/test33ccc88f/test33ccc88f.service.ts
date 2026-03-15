import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateTest33CCC88FDto } from './dto/create-test33ccc88f.dto'
import { Test33CCC88F } from './test33ccc88f.schema'

@Injectable()
export class Test33CCC88FService {
	constructor(
		@InjectModel(Test33CCC88F)
		private model: Model<Test33CCC88F>,
	) {}

	create(dto: CreateTest33CCC88FDto) {
		return this.model.create(dto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findById(id)
	}

	update(id: string, dto: CreateTest33CCC88FDto) {
		return this.model.update(id, dto)
	}

	remove(id: string) {
		return this.model.delete(id)
	}
}
