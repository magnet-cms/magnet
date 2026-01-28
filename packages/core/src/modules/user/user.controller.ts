import { Resolve } from '@magnet-cms/common'
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Query,
} from '@nestjs/common'
import { CreateUserDto } from './dto/create-user.dto'
import { User } from './schemas/user.schema'
import { UserService } from './user.service'

@Controller('users')
export class UserController {
	constructor(private readonly userService: UserService) {}

	@Post('')
	@Resolve(() => User)
	async create(@Body() createUserDto: CreateUserDto): Promise<User> {
		return this.userService.create(createUserDto) as Promise<User>
	}

	@Get()
	async findAll(@Query('page') page = '1', @Query('limit') limit = '20') {
		return this.userService.findAllPaginated(
			Number.parseInt(page, 10),
			Number.parseInt(limit, 10),
		)
	}

	@Get(':id')
	@Resolve(() => User)
	async findOne(@Param('id') id: string): Promise<User | null> {
		return this.userService.findOneById(id) as Promise<User | null>
	}

	@Put(':id')
	@Resolve(() => Boolean)
	async update(
		@Param('id') id: string,
		@Body() updateUserDto: CreateUserDto,
	): Promise<boolean> {
		const result = await this.userService.update(id, updateUserDto)
		return !!result
	}

	@Delete(':id')
	@Resolve(() => Boolean)
	async remove(@Param('id') id: string): Promise<boolean> {
		return this.userService.remove(id)
	}

	@Post(':id/reset-password')
	async resetPassword(
		@Param('id') id: string,
		@Body() body: { newPassword: string },
	): Promise<{ message: string }> {
		return this.userService.resetPassword(id, body.newPassword)
	}
}
