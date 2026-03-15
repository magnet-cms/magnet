import { Resolve } from '@magnet-cms/common'
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { CreateTest9DB0253CDto } from './dto/create-test9db0253c.dto'
import { Test9DB0253C } from './test9db0253c.schema'
import { Test9DB0253CService } from './test9db0253c.service'

@Controller('test9db0253c')
export class Test9DB0253CController {
	constructor(private readonly test9db0253cService: Test9DB0253CService) {}

	@Post()
	@Resolve(() => Test9DB0253C)
	create(@Body() dto: CreateTest9DB0253CDto) {
		return this.test9db0253cService.create(dto)
	}

	@Get()
	@Resolve(() => [Test9DB0253C])
	findAll() {
		return this.test9db0253cService.findAll()
	}

	@Get(':id')
	@Resolve(() => Test9DB0253C)
	findOne(@Param('id') id: string) {
		return this.test9db0253cService.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	update(@Param('id') id: string, @Body() dto: CreateTest9DB0253CDto) {
		return this.test9db0253cService.update(id, dto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.test9db0253cService.remove(id)
	}
}
