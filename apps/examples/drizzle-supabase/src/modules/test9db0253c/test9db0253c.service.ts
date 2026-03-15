import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateTest9DB0253CDto } from './dto/create-test9db0253c.dto'
import { Test9DB0253C } from './test9db0253c.schema'

@Injectable()
export class Test9DB0253CService {
	constructor(
		@InjectModel(Test9DB0253C)
		private model: Model<Test9DB0253C>,
	) {}

	create(dto: CreateTest9DB0253CDto) {
		return this.model.create(dto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findById(id)
	}

	update(id: string, dto: CreateTest9DB0253CDto) {
		return this.model.update(id, dto)
	}

	remove(id: string) {
		return this.model.delete(id)
	}
}
