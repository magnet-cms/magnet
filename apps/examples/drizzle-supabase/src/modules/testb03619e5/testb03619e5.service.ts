import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateTestB03619E5Dto } from './dto/create-testb03619e5.dto'
import { TestB03619E5 } from './testb03619e5.schema'

@Injectable()
export class TestB03619E5Service {
	constructor(
		@InjectModel(TestB03619E5)
		private model: Model<TestB03619E5>,
	) {}

	create(dto: CreateTestB03619E5Dto) {
		return this.model.create(dto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findById(id)
	}

	update(id: string, dto: CreateTestB03619E5Dto) {
		return this.model.update(id, dto)
	}

	remove(id: string) {
		return this.model.delete(id)
	}
}
