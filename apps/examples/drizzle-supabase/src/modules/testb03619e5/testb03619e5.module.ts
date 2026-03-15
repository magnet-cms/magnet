import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { TestB03619E5Controller } from './testb03619e5.controller'
import { TestB03619E5 } from './testb03619e5.schema'
import { TestB03619E5Service } from './testb03619e5.service'

@Module({
	imports: [MagnetModule.forFeature(TestB03619E5)],
	controllers: [TestB03619E5Controller],
	providers: [TestB03619E5Service],
})
export class TestB03619E5Module {}
