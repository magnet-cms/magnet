import { Resolve } from '@magnet-cms/common'
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { CreateTestB03619E5Dto } from './dto/create-testb03619e5.dto'
import { TestB03619E5 } from './testb03619e5.schema'
import { TestB03619E5Service } from './testb03619e5.service'

@Controller('testb03619e5')
export class TestB03619E5Controller {
	constructor(private readonly testb03619e5Service: TestB03619E5Service) {}

	@Post()
	@Resolve(() => TestB03619E5)
	create(@Body() dto: CreateTestB03619E5Dto) {
		return this.testb03619e5Service.create(dto)
	}

	@Get()
	@Resolve(() => [TestB03619E5])
	findAll() {
		return this.testb03619e5Service.findAll()
	}

	@Get(':id')
	@Resolve(() => TestB03619E5)
	findOne(@Param('id') id: string) {
		return this.testb03619e5Service.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	update(@Param('id') id: string, @Body() dto: CreateTestB03619E5Dto) {
		return this.testb03619e5Service.update(id, dto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.testb03619e5Service.remove(id)
	}
}
