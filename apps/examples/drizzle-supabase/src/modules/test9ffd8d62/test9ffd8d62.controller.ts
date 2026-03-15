import { Resolve } from '@magnet-cms/common'
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { CreateTest9FFD8D62Dto } from './dto/create-test9ffd8d62.dto'
import { Test9FFD8D62 } from './test9ffd8d62.schema'
import { Test9FFD8D62Service } from './test9ffd8d62.service'

@Controller('test9ffd8d62')
export class Test9FFD8D62Controller {
	constructor(private readonly test9ffd8d62Service: Test9FFD8D62Service) {}

	@Post()
	@Resolve(() => Test9FFD8D62)
	create(@Body() dto: CreateTest9FFD8D62Dto) {
		return this.test9ffd8d62Service.create(dto)
	}

	@Get()
	@Resolve(() => [Test9FFD8D62])
	findAll() {
		return this.test9ffd8d62Service.findAll()
	}

	@Get(':id')
	@Resolve(() => Test9FFD8D62)
	findOne(@Param('id') id: string) {
		return this.test9ffd8d62Service.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	update(@Param('id') id: string, @Body() dto: CreateTest9FFD8D62Dto) {
		return this.test9ffd8d62Service.update(id, dto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.test9ffd8d62Service.remove(id)
	}
}
