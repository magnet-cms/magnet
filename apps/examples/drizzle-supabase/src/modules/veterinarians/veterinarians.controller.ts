import { RequirePermission, Resolve } from '@magnet-cms/common'
import { JwtAuthGuard } from '@magnet-cms/core/modules'
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
import { Veterinarian } from './schemas/veterinarian.schema'
import { VeterinariansService } from './veterinarians.service'

@Controller('veterinarians')
@UseGuards(JwtAuthGuard)
export class VeterinariansController {
	constructor(private readonly veterinariansService: VeterinariansService) {}

	@Post('')
	@Resolve(() => Veterinarian)
	@RequirePermission({
		id: 'content.veterinarian.create',
		name: 'Create Veterinarian',
		description: 'Create a new veterinarian entry',
	})
	create(@Body() createVeterinarianDto: Partial<Veterinarian>) {
		return this.veterinariansService.create(createVeterinarianDto)
	}

	@Get()
	@Resolve(() => [Veterinarian])
	@RequirePermission({
		id: 'content.veterinarian.find',
		name: 'List Veterinarians',
		description: 'List veterinarian entries',
	})
	findAll(): Promise<Veterinarian[]> {
		return this.veterinariansService.findAll()
	}

	@Get(':id')
	@Resolve(() => Veterinarian)
	@RequirePermission({
		id: 'content.veterinarian.findOne',
		name: 'View Veterinarian',
		description: 'View a veterinarian entry',
	})
	findOne(@Param('id') id: string): Promise<Veterinarian> {
		return this.veterinariansService.findOne(id)
	}

	@Put(':id')
	@Resolve(() => Boolean)
	@RequirePermission({
		id: 'content.veterinarian.update',
		name: 'Update Veterinarian',
		description: 'Update a veterinarian entry',
	})
	update(
		@Param('id') id: string,
		@Body() updateVeterinarianDto: Partial<Veterinarian>,
	) {
		return this.veterinariansService.update(id, updateVeterinarianDto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	@RequirePermission({
		id: 'content.veterinarian.delete',
		name: 'Delete Veterinarian',
		description: 'Delete a veterinarian entry',
	})
	remove(@Param('id') id: string) {
		return this.veterinariansService.remove(id)
	}
}
