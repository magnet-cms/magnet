import { Resolve } from '@magnet/common'
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common'
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
	@Resolve(() => [User])
	async findAll(): Promise<User[]> {
		return this.userService.findAll() as Promise<User[]>
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
}
