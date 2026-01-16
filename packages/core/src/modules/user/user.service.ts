import { InjectModel, Model } from '@magnet-cms/common'
import { Injectable } from '@nestjs/common'
import { CreateUserDto } from './dto/create-user.dto'
import { User } from './schemas/user.schema'

@Injectable()
export class UserService {
	constructor(@InjectModel(User) private readonly userModel: Model<User>) {}

	async findAll() {
		return this.userModel.find()
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
}
