import {
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
		await this.authService.register(registerDto)
		return this.authService.login({
			email: registerDto.email,
			password: registerDto.password,
		})
	}

	@Post('login')
	async login(@Body() body: { email: string; password: string }) {
		return this.authService.login(body)
	}

	@UseGuards(JwtAuthGuard)
	@Get('me')
	async me(@Request() req: { user: AuthenticatedUser }) {
		try {
			// Try to get full user info from database
			return await this.authService.getUserById(req.user.id)
		} catch {
			// For external auth providers (Supabase, Auth0) or custom strategies,
			// the user may not exist in the local database. Return JWT payload instead.
			return {
				id: req.user.id,
				email: req.user.email,
				role: req.user.role,
				name: req.user.email.split('@')[0], // Use email prefix as fallback name
			}
		}
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
