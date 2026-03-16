import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { Veterinarian } from './schemas/veterinarian.schema'

@Injectable()
export class VeterinariansService {
	constructor(
		@InjectModel(Veterinarian)
		private model: Model<Veterinarian>,
	) {}

	create(createVeterinarianDto: Partial<Veterinarian>) {
		return this.model.create(createVeterinarianDto)
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

	async update(id: string, updateVeterinarianDto: Partial<Veterinarian>) {
		return await this.model.update({ id }, updateVeterinarianDto)
	}

	findBySpecialization(specialization: string) {
		return this.model.query().where({ specialization }).exec()
	}
}
