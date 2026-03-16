import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { MedicalRecordsController } from './medical-records.controller'
import { MedicalRecordsService } from './medical-records.service'
import { MedicalRecord } from './schemas/medical-record.schema'

@Module({
	imports: [MagnetModule.forFeature(MedicalRecord)],
	controllers: [MedicalRecordsController],
	providers: [MedicalRecordsService],
	exports: [MedicalRecordsService],
})
export class MedicalRecordsModule {}
