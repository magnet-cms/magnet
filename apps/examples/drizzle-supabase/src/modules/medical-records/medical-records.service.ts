import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { MedicalRecord } from './schemas/medical-record.schema'

@Injectable()
export class MedicalRecordsService {
	constructor(
		@InjectModel(MedicalRecord)
		private model: Model<MedicalRecord>,
	) {}

	create(createMedicalRecordDto: Partial<MedicalRecord>) {
		return this.model.create(createMedicalRecordDto)
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

	async update(id: string, updateMedicalRecordDto: Partial<MedicalRecord>) {
		return await this.model.update({ id }, updateMedicalRecordDto)
	}

	findByCat(catId: string) {
		return this.model.query().where({ cat: catId }).sort({ date: -1 }).exec()
	}

	findByVeterinarian(veterinarianId: string) {
		return this.model
			.query()
			.where({ veterinarian: veterinarianId })
			.sort({ date: -1 })
			.exec()
	}

	findByType(type: string) {
		return this.model.query().where({ type }).sort({ date: -1 }).exec()
	}
}
