import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateCatDto } from './dto/create-cat.dto'
import { Cat } from './schemas/cat.schema'

@Injectable()
export class CatsService {
	constructor(
		@InjectModel(Cat)
		private model: Model<Cat>,
	) {}

	create(createUserDto: CreateCatDto) {
		return this.model.create(createUserDto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findOne({ id })
	}

	async remove(id: string) {
		return await this.model.delete({ id })
	}

	async update(id: string, updateUserDto: CreateCatDto) {
		return await this.model.update({ id }, updateUserDto)
	}
}
