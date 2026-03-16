import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { Owner } from './schemas/owner.schema'

@Injectable()
export class OwnersService {
	constructor(
		@InjectModel(Owner)
		private model: Model<Owner>,
	) {}

	create(createOwnerDto: Partial<Owner>) {
		return this.model.create(createOwnerDto)
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

	async update(id: string, updateOwnerDto: Partial<Owner>) {
		return await this.model.update({ id }, updateOwnerDto)
	}

	findByEmail(email: string) {
		return this.model.findOne({ email })
	}
}
