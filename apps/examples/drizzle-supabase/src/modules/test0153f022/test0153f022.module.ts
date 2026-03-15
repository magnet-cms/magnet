import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { Test0153F022Controller } from './test0153f022.controller'
import { Test0153F022 } from './test0153f022.schema'
import { Test0153F022Service } from './test0153f022.service'

@Module({
	imports: [MagnetModule.forFeature(Test0153F022)],
	controllers: [Test0153F022Controller],
	providers: [Test0153F022Service],
})
export class Test0153F022Module {}
