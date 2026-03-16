import { Resolve } from '@magnet-cms/common'
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
import { CreateOwnerDto } from './dto/create-owner.dto'
import { OwnersService } from './owners.service'
import { Owner } from './schemas/owner.schema'

@Controller('owners')
export class OwnersController {
	constructor(private readonly ownersService: OwnersService) {}

	@Post('')
	@Resolve(() => Owner)
	create(@Body() createOwnerDto: CreateOwnerDto) {
		return this.ownersService.create(createOwnerDto)
	}

	@Get()
	@Resolve(() => [Owner])
	findAll(): Promise<Owner[]> {
		return this.ownersService.findAll()
	}

	@Get(':id')
	@Resolve(() => Owner)
	findOne(@Param('id') id: string): Promise<Owner> {
		return this.ownersService.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	update(@Param('id') id: string, @Body() updateOwnerDto: Partial<Owner>) {
		return this.ownersService.update(id, updateOwnerDto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.ownersService.remove(id)
	}
}
