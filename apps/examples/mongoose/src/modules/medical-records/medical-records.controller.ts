import { RequirePermission, Resolve } from '@magnet-cms/common'
import { JwtAuthGuard } from '@magnet-cms/core/modules'
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
	UseGuards,
} from '@nestjs/common'
import { MedicalRecordsService } from './medical-records.service'
import { MedicalRecord } from './schemas/medical-record.schema'

@Controller('medical-records')
@UseGuards(JwtAuthGuard)
export class MedicalRecordsController {
	constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

	@Post('')
	@Resolve(() => MedicalRecord)
	@RequirePermission({
		id: 'content.medical-record.create',
		name: 'Create Medical Record',
		description: 'Create a new medical record entry',
	})
	create(@Body() createMedicalRecordDto: Partial<MedicalRecord>) {
		return this.medicalRecordsService.create(createMedicalRecordDto)
	}

	@Get()
	@Resolve(() => [MedicalRecord])
	@RequirePermission({
		id: 'content.medical-record.find',
		name: 'List Medical Records',
		description: 'List medical record entries',
	})
	findAll(
		@Query('catId') catId?: string,
		@Query('veterinarianId') veterinarianId?: string,
		@Query('type') type?: string,
	): Promise<MedicalRecord[]> {
		if (catId) {
			return this.medicalRecordsService.findByCat(catId)
		}
		if (veterinarianId) {
			return this.medicalRecordsService.findByVeterinarian(veterinarianId)
		}
		if (type) {
			return this.medicalRecordsService.findByType(type)
		}
		return this.medicalRecordsService.findAll()
	}

	@Get(':id')
	@Resolve(() => MedicalRecord)
	@RequirePermission({
		id: 'content.medical-record.findOne',
		name: 'View Medical Record',
		description: 'View a medical record entry',
	})
	findOne(@Param('id') id: string): Promise<MedicalRecord> {
		return this.medicalRecordsService.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	@RequirePermission({
		id: 'content.medical-record.update',
		name: 'Update Medical Record',
		description: 'Update a medical record entry',
	})
	update(
		@Param('id') id: string,
		@Body() updateMedicalRecordDto: Partial<MedicalRecord>,
	) {
		return this.medicalRecordsService.update(id, updateMedicalRecordDto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	@RequirePermission({
		id: 'content.medical-record.delete',
		name: 'Delete Medical Record',
		description: 'Delete a medical record entry',
	})
	remove(@Param('id') id: string) {
		return this.medicalRecordsService.remove(id)
	}
}
