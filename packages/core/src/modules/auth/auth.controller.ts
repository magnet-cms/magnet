import {
	BadRequestException,
	Body,
	Controller,
	Get,
	Post,
	Put,
	Request,
	UseGuards,
} from '@nestjs/common'
import { AuthService } from './auth.service'

import { ChangePasswordDto } from './dto/change-password.dto'
import { RegisterDTO } from './dto/register.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

interface AuthenticatedUser {
	id: string
	email: string
	role: string
}

@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	@Post('register')
	async register(@Body() registerDto: RegisterDTO) {
		const user = await this.authService.register(registerDto)
		return this.authService.login(user)
	}

	@Post('login')
	async login(@Body() body: { email: string; password: string }) {
		const user = await this.authService.validateUser(body.email, body.password)
		if (!user) throw new BadRequestException('Invalid credentials')

		return this.authService.login(user as AuthenticatedUser)
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	async me(@Request() req: { user: AuthenticatedUser }) {
		return this.authService.getUserById(req.user.id)
	}

	@Get('status')
	async status(@Request() req: any) {
		if (req.user) {
			return { authenticated: true, user: req.user }
		}

		const existingUser = await this.authService.exists()

		return {
			authenticated: false,
			requiresSetup: !existingUser,
			message: existingUser
				? 'Authentication required.'
				: 'No users found. Initial setup required.',
		}
	}

	@UseGuards(JwtAuthGuard)
	@Put('account/profile')
	async updateProfile(
		@Request() req: { user: AuthenticatedUser },
		@Body() updateProfileDto: UpdateProfileDto,
	) {
		return this.authService.updateProfile(req.user.id, updateProfileDto)
	}

	@UseGuards(JwtAuthGuard)
	@Put('account/password')
	async changePassword(
		@Request() req: { user: AuthenticatedUser },
		@Body() changePasswordDto: ChangePasswordDto,
	) {
		return this.authService.changePassword(req.user.id, changePasswordDto)
	}
}
