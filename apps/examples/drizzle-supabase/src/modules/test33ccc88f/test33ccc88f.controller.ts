import { Resolve } from '@magnet-cms/common'
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { CreateTest33CCC88FDto } from './dto/create-test33ccc88f.dto'
import { Test33CCC88F } from './test33ccc88f.schema'
import { Test33CCC88FService } from './test33ccc88f.service'

@Controller('test33ccc88f')
export class Test33CCC88FController {
	constructor(private readonly test33ccc88fService: Test33CCC88FService) {}

	@Post()
	@Resolve(() => Test33CCC88F)
	create(@Body() dto: CreateTest33CCC88FDto) {
		return this.test33ccc88fService.create(dto)
	}

	@Get()
	@Resolve(() => [Test33CCC88F])
	findAll() {
		return this.test33ccc88fService.findAll()
	}

	@Get(':id')
	@Resolve(() => Test33CCC88F)
	findOne(@Param('id') id: string) {
		return this.test33ccc88fService.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	update(@Param('id') id: string, @Body() dto: CreateTest33CCC88FDto) {
		return this.test33ccc88fService.update(id, dto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.test33ccc88fService.remove(id)
	}
}
