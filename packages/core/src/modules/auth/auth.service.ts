import type { AuthStrategy } from '@magnet/common'
import { MagnetModuleOptions } from '@magnet/common'
import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from '@nestjs/common'
import { compare, hash } from 'bcryptjs'
import { UserService } from '~/modules/user'
import { AUTH_STRATEGY } from './auth.constants'
import { ChangePasswordDto } from './dto/change-password.dto'
import { RegisterDTO } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'

@Injectable()
export class AuthService {
	constructor(
		private userService: UserService,
		@Inject(AUTH_STRATEGY) private readonly authStrategy: AuthStrategy,
		@Inject(MagnetModuleOptions) private readonly options: MagnetModuleOptions,
	) {}

	/**
	 * Register a new user via the configured auth strategy
	 */
	async register(registerDto: RegisterDTO) {
		return this.authStrategy.register({
			email: registerDto.email,
			password: registerDto.password,
			name: registerDto.name,
			role: registerDto.role,
		})
	}

	/**
	 * Validate user credentials via the configured auth strategy
	 */
	async validateUser(email: string, pass: string) {
		return this.authStrategy.validateCredentials(email, pass)
	}

	/**
	 * Login with credentials and return tokens via the configured auth strategy
	 */
	async login(credentials: { email: string; password: string }) {
		return this.authStrategy.login(credentials)
	}

	/**
	 * Check if any users exist in the system
	 */
	async exists() {
		const users = await this.userService.findAll()
		return users.length > 0
	}

	/**
	 * Get user by ID
	 */
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

	/**
	 * Update user profile
	 */
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

	/**
	 * Change user password
	 */
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

	/**
	 * Get the current auth strategy name
	 */
	getStrategyName(): string {
		return this.authStrategy.name
	}
}
