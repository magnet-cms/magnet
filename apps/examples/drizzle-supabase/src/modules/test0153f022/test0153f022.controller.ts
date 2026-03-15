import { Resolve } from '@magnet-cms/common'
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { CreateTest0153F022Dto } from './dto/create-test0153f022.dto'
import { Test0153F022 } from './test0153f022.schema'
import { Test0153F022Service } from './test0153f022.service'

@Controller('test0153f022')
export class Test0153F022Controller {
	constructor(private readonly test0153f022Service: Test0153F022Service) {}

	@Post()
	@Resolve(() => Test0153F022)
	create(@Body() dto: CreateTest0153F022Dto) {
		return this.test0153f022Service.create(dto)
	}

	@Get()
	@Resolve(() => [Test0153F022])
	findAll() {
		return this.test0153f022Service.findAll()
	}

	@Get(':id')
	@Resolve(() => Test0153F022)
	findOne(@Param('id') id: string) {
		return this.test0153f022Service.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	update(@Param('id') id: string, @Body() dto: CreateTest0153F022Dto) {
		return this.test0153f022Service.update(id, dto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.test0153f022Service.remove(id)
	}
}
