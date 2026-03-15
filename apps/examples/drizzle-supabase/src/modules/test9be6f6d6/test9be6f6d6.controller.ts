import { Resolve } from '@magnet-cms/common'
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { CreateTest9BE6F6D6Dto } from './dto/create-test9be6f6d6.dto'
import { Test9BE6F6D6 } from './test9be6f6d6.schema'
import { Test9BE6F6D6Service } from './test9be6f6d6.service'

@Controller('test9be6f6d6')
export class Test9BE6F6D6Controller {
	constructor(private readonly test9be6f6d6Service: Test9BE6F6D6Service) {}

	@Post()
	@Resolve(() => Test9BE6F6D6)
	create(@Body() dto: CreateTest9BE6F6D6Dto) {
		return this.test9be6f6d6Service.create(dto)
	}

	@Get()
	@Resolve(() => [Test9BE6F6D6])
	findAll() {
		return this.test9be6f6d6Service.findAll()
	}

	@Get(':id')
	@Resolve(() => Test9BE6F6D6)
	findOne(@Param('id') id: string) {
		return this.test9be6f6d6Service.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	update(@Param('id') id: string, @Body() dto: CreateTest9BE6F6D6Dto) {
		return this.test9be6f6d6Service.update(id, dto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.test9be6f6d6Service.remove(id)
	}
}
