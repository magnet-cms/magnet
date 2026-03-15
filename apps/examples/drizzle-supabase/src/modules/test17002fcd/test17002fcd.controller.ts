import { Resolve } from '@magnet-cms/common'
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { CreateTest17002FCDDto } from './dto/create-test17002fcd.dto'
import { Test17002FCD } from './test17002fcd.schema'
import { Test17002FCDService } from './test17002fcd.service'

@Controller('test17002fcd')
export class Test17002FCDController {
	constructor(private readonly test17002fcdService: Test17002FCDService) {}

	@Post()
	@Resolve(() => Test17002FCD)
	create(@Body() dto: CreateTest17002FCDDto) {
		return this.test17002fcdService.create(dto)
	}

	@Get()
	@Resolve(() => [Test17002FCD])
	findAll() {
		return this.test17002fcdService.findAll()
	}

	@Get(':id')
	@Resolve(() => Test17002FCD)
	findOne(@Param('id') id: string) {
		return this.test17002fcdService.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	update(@Param('id') id: string, @Body() dto: CreateTest17002FCDDto) {
		return this.test17002fcdService.update(id, dto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.test17002fcdService.remove(id)
	}
}
