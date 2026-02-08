import { RequirePermission, Resolve } from '@magnet-cms/common'
import { JwtAuthGuard, PermissionGuard } from '@magnet-cms/core'
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	UseGuards,
} from '@nestjs/common'
import { CreateOwnerDto } from './dto/create-owner.dto'
import { OwnersService } from './owners.service'
import { Owner } from './schemas/owner.schema'

@Controller('owners')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OwnersController {
	constructor(private readonly ownersService: OwnersService) {}

	@Post('')
	@Resolve(() => Owner)
	@RequirePermission({
		id: 'content.owner.create',
		name: 'Create Owner',
		description: 'Create a new owner entry',
	})
	create(@Body() createOwnerDto: CreateOwnerDto) {
		return this.ownersService.create(createOwnerDto)
	}

	@Get()
	@Resolve(() => [Owner])
	@RequirePermission({
		id: 'content.owner.find',
		name: 'List Owners',
		description: 'List owner entries',
	})
	findAll(): Promise<Owner[]> {
		return this.ownersService.findAll()
	}

	@Get(':id')
	@Resolve(() => Owner)
	@RequirePermission({
		id: 'content.owner.findOne',
		name: 'View Owner',
		description: 'View an owner entry',
	})
	findOne(@Param('id') id: string): Promise<Owner> {
		return this.ownersService.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	@RequirePermission({
		id: 'content.owner.update',
		name: 'Update Owner',
		description: 'Update an owner entry',
	})
	update(@Param('id') id: string, @Body() updateOwnerDto: Partial<Owner>) {
		return this.ownersService.update(id, updateOwnerDto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	@RequirePermission({
		id: 'content.owner.delete',
		name: 'Delete Owner',
		description: 'Delete an owner entry',
	})
	remove(@Param('id') id: string) {
		return this.ownersService.remove(id)
	}
}
