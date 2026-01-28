import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable, NotFoundException } from '@nestjs/common'
import { hash } from 'bcryptjs'
import { CreateUserDto } from './dto/create-user.dto'
import { User } from './schemas/user.schema'

export interface PaginatedUserResult {
	users: User[]
	total: number
	page: number
	limit: number
}

@Injectable()
export class UserService {
	constructor(@InjectModel(User) private readonly userModel: Model<User>) {}

	async findAll() {
		return this.userModel.find()
	}

	async findAllPaginated(page = 1, limit = 20): Promise<PaginatedUserResult> {
		const users = await this.userModel.find()
		const total = users.length
		const startIndex = (page - 1) * limit
		const paginatedUsers = users.slice(startIndex, startIndex + limit)

		return {
			users: paginatedUsers,
			total,
			page,
			limit,
		}
	}

	async findOne(query: Partial<User>) {
		return this.userModel.findOne(query)
	}

	async findOneById(id: string) {
		return this.userModel.findOne({ id })
	}

	async create(userData: CreateUserDto) {
		return this.userModel.create(userData)
	}

	async update(id: string, updateUserDto: Partial<CreateUserDto>) {
		return this.userModel.update({ id }, updateUserDto)
	}

	async remove(id: string) {
		return this.userModel.delete({ id })
	}

	async resetPassword(
		id: string,
		newPassword: string,
	): Promise<{ message: string }> {
		const user = await this.findOneById(id)
		if (!user) {
			throw new NotFoundException('User not found')
		}

		const hashedPassword = await hash(newPassword, 10)
		await this.userModel.update({ id }, { password: hashedPassword })

		return { message: 'Password reset successfully' }
	}
}
