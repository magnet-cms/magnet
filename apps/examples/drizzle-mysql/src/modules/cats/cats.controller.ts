import { Resolve } from '@magnet-cms/common'
import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	Post,
	Put,
	Query,
} from '@nestjs/common'
import { CatsService } from './cats.service'
import { CreateCatDto } from './dto/create-cat.dto'
import { Cat } from './schemas/cat.schema'

@Controller('cats')
export class CatsController {
	constructor(private readonly catsService: CatsService) {}

	@Post('')
	@Resolve(() => Cat)
	create(@Body() createCatDto: CreateCatDto) {
		return this.catsService.create(createCatDto)
	}

	@Get()
	@Resolve(() => [Cat])
	findAll(
		@Query('breed') breed?: string,
		@Query('ownerId') ownerId?: string,
		@Query('minWeight') minWeight?: string,
		@Query('maxWeight') maxWeight?: string,
		@Query('castrated') castrated?: string,
		@Query('search') search?: string,
		@Query('page') page?: string,
		@Query('limit') limit?: string,
		@Query('sortBy') sortBy?: string,
	): Promise<Cat[]> {
		// Search functionality
		if (search) {
			return this.catsService.searchCats(search)
		}

		// Find by breed
		if (breed) {
			return this.catsService.findByBreed(breed)
		}

		// Find by owner
		if (ownerId) {
			return this.catsService.findCatsByOwner(ownerId)
		}

		// Advanced filtering with multiple criteria
		const minWeightNum = minWeight ? Number.parseFloat(minWeight) : undefined
		const maxWeightNum = maxWeight ? Number.parseFloat(maxWeight) : undefined
		const castratedBool =
			castrated === undefined ? undefined : castrated === 'true'

		if (
			minWeightNum !== undefined ||
			maxWeightNum !== undefined ||
			castratedBool !== undefined
		) {
			return this.catsService.findCatsByCriteria({
				minWeight: minWeightNum,
				maxWeight: maxWeightNum,
				castrated: castratedBool,
			})
		}

		// Pagination
		if (page || limit) {
			const pageNum = page ? Number.parseInt(page, 10) : 1
			const limitNum = limit ? Number.parseInt(limit, 10) : 10
			const sortByField = sortBy || 'tagID'
			return this.catsService.findPaginated(pageNum, limitNum, sortByField)
		}

		// Default: return all
		return this.catsService.findAll()
	}

	@Get('statistics')
	@Resolve(() => Object)
	getStatistics() {
		return this.catsService.getCatsStatistics()
	}

	@Get('heavy/:threshold')
	@Resolve(() => [Cat])
	findHeavyCats(@Param('threshold') threshold: string): Promise<Cat[]> {
		const thresholdNum = Number.parseFloat(threshold)
		return this.catsService.findHeavyCats(thresholdNum)
	}

	@Get(':id')
	@Resolve(() => Cat)
	async findOne(@Param('id') id: string): Promise<Cat | null> {
		const cat = await this.catsService.findOne(id)
		if (!cat) {
			throw new NotFoundException(null)
		}
		return cat
	}

	@Put(':id')
	@Resolve(() => Boolean)
	update(@Param('id') id: string, @Body() updateCatDto: Partial<CreateCatDto>) {
		return this.catsService.update(id, updateCatDto)
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	remove(@Param('id') id: string) {
		return this.catsService.remove(id)
	}
}
