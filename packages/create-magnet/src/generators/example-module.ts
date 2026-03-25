export function generateExampleSchema(): string {
  return `import { Prop, Schema, UI, Validators } from '@magnet-cms/common'
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator'

@Schema()
export class Item {
	@Prop({ required: true })
	@Validators(IsString(), Length(2, 255), IsNotEmpty())
	@UI({ tab: 'General', description: 'Item name' })
	name: string

	@Prop({ required: false })
	@Validators(IsString(), IsOptional())
	@UI({ tab: 'General', type: 'textarea', description: 'Item description' })
	description?: string

	@Prop({ required: false, default: true })
	@UI({ tab: 'Settings', type: 'switch', description: 'Is this item active?' })
	isActive?: boolean
}
`
}

export function generateExampleDto(): string {
  return `import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator'

export class CreateItemDto {
	@IsString()
	@Length(2, 255)
	@IsNotEmpty()
	name: string

	@IsString()
	@IsOptional()
	description?: string

	@IsBoolean()
	@IsOptional()
	isActive?: boolean
}

export class UpdateItemDto {
	@IsString()
	@Length(2, 255)
	@IsOptional()
	name?: string

	@IsString()
	@IsOptional()
	description?: string

	@IsBoolean()
	@IsOptional()
	isActive?: boolean
}
`
}

export function generateExampleService(): string {
  return `import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateItemDto, UpdateItemDto } from './dto/item.dto'
import { Item } from './schemas/item.schema'

@Injectable()
export class ItemsService {
	constructor(
		@InjectModel(Item)
		private model: Model<Item>,
	) {}

	create(createItemDto: CreateItemDto) {
		return this.model.create(createItemDto)
	}

	findAll() {
		return this.model.find()
	}

	findOne(id: string) {
		return this.model.findOne({ id })
	}

	update(id: string, updateItemDto: UpdateItemDto) {
		return this.model.update({ id }, updateItemDto)
	}

	remove(id: string) {
		return this.model.delete({ id })
	}
}
`
}

export function generateExampleController(): string {
  return `import { Resolve } from '@magnet-cms/common'
import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	Patch,
	Post,
} from '@nestjs/common'
import { CreateItemDto, UpdateItemDto } from './dto/item.dto'
import { ItemsService } from './items.service'
import { Item } from './schemas/item.schema'

@Controller('items')
export class ItemsController {
	constructor(private readonly itemsService: ItemsService) {}

	@Post()
	@Resolve(() => Item)
	create(@Body() createItemDto: CreateItemDto) {
		return this.itemsService.create(createItemDto)
	}

	@Get()
	@Resolve(() => [Item])
	findAll() {
		return this.itemsService.findAll()
	}

	@Get(':id')
	@Resolve(() => Item)
	async findOne(@Param('id') id: string) {
		const item = await this.itemsService.findOne(id)
		if (!item) {
			throw new NotFoundException(\`Item with id \${id} not found\`)
		}
		return item
	}

	@Patch(':id')
	@Resolve(() => Item)
	update(@Param('id') id: string, @Body() updateItemDto: UpdateItemDto) {
		return this.itemsService.update(id, updateItemDto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.itemsService.remove(id)
	}
}
`
}

export function generateExampleModule(): string {
  return `import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'
import { ItemsController } from './items.controller'
import { ItemsService } from './items.service'
import { Item } from './schemas/item.schema'

@Module({
	imports: [MagnetModule.forFeature([Item])],
	controllers: [ItemsController],
	providers: [ItemsService],
})
export class ItemsModule {}
`
}
