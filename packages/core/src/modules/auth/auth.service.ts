import { MagnetModuleOptions } from '@magnet/common'
import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { compare, hash } from 'bcryptjs'
import { UserService } from '~/modules/user'
import { ChangePasswordDto } from './dto/change-password.dto'
import { RegisterDTO } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

@Injectable()
export class AuthService {
	constructor(
		private userService: UserService,
		private jwtService: JwtService,
		@Inject(MagnetModuleOptions) private readonly options: MagnetModuleOptions,
	) {}

	async register(registerDto: RegisterDTO) {
		const existingUser = await this.userService.findOne({
			email: registerDto.email,
		})

		if (existingUser) throw new ConflictException('Email already in use')

		const hashedPassword = await hash(registerDto.password, 10)
		const newUser = await this.userService.create({
			...registerDto,
			password: hashedPassword,
		})

		return newUser
	}

	async validateUser(email: string, pass: string) {
		const user = await this.userService.findOne({ email })
		if (!user) return null

		const isPasswordValid = await compare(pass, user.password)
		if (!isPasswordValid) return null

		return user
	}

	async login(user: { id: string; email: string; role: string }) {
		const payload = { sub: user.id, email: user.email, role: user.role }
		return {
			access_token: this.jwtService.sign(payload, {
				secret: this.options.jwt.secret,
			}),
		}
	}

	async exists() {
		const users = await this.userService.findAll()
		return users.length > 0
	}

	async getUserById(id: string) {
		const user = await this.userService.findOneById(id)
		if (!user) throw new NotFoundException('User not found')

		return {
			id: (user as any).id || (user as any)._id?.toString(),
			email: user.email,
			name: user.name,
			role: user.role,
		}
	}

	async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
		const user = await this.userService.findOneById(userId)
		if (!user) throw new NotFoundException('User not found')

		if (updateProfileDto.email && updateProfileDto.email !== user.email) {
			const existingUser = await this.userService.findOne({
				email: updateProfileDto.email,
			})
			if (existingUser) throw new ConflictException('Email already in use')
		}

		await this.userService.update(userId, updateProfileDto)
		return this.getUserById(userId)
	}

	async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
		const user = await this.userService.findOneById(userId)
		if (!user) throw new NotFoundException('User not found')

		const isPasswordValid = await compare(
			changePasswordDto.currentPassword,
			user.password,
		)
		if (!isPasswordValid) {
			throw new BadRequestException('Current password is incorrect')
		}

		const hashedPassword = await hash(changePasswordDto.newPassword, 10)
		await this.userService.update(userId, { password: hashedPassword })

		return { message: 'Password changed successfully' }
	}
}
