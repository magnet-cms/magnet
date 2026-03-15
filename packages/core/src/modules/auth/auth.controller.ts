import type { AuthResult, AuthUser } from '@magnet-cms/common'
import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Req,
	UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import type { RequestContext, SessionInfo } from './auth.service'
import { AuthService } from './auth.service'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { RegisterDTO } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { DynamicAuthGuard } from './guards/dynamic-auth.guard'

/**
 * Authenticated user from JWT payload
 */
interface AuthenticatedUser {
	id: string
	email: string
	role: string
}

/**
 * Extended request with user and session info
 */
interface AuthenticatedRequest extends Request {
	user: AuthenticatedUser
	sessionId?: string
}

/**
 * Authentication controller providing endpoints for:
 * - User registration and login
 * - Token refresh and logout
 * - Session management
 * - Password reset and change
 * - Profile management
 */
@Controller('auth')
export class AuthController {
	constructor(private authService: AuthService) {}

	// ============================================================================
	// Authentication
	// ============================================================================

	/**
	 * Register a new user
	 */
	@Post('register')
	async register(
		@Body() registerDto: RegisterDTO,
		@Req() req: Request,
	): Promise<AuthResult> {
		await this.authService.register(registerDto)
		return this.authService.login(
			{ email: registerDto.email, password: registerDto.password },
			this.getRequestContext(req),
		)
	}

	/**
	 * Login with credentials
	 */
	@Post('login')
	async login(
		@Body() loginDto: LoginDto,
		@Req() req: Request,
	): Promise<AuthResult> {
		return this.authService.login(loginDto, this.getRequestContext(req))
	}

	/**
	 * Refresh access token
	 */
	@Post('refresh')
	async refresh(
		@Body() refreshTokenDto: RefreshTokenDto,
		@Req() req: Request,
	): Promise<AuthResult> {
		return this.authService.refresh(
			refreshTokenDto.refresh_token,
			this.getRequestContext(req),
		)
	}

	/**
	 * Logout (revoke refresh token)
	 */
	@Post('logout')
	@UseGuards(DynamicAuthGuard)
	async logout(
		@Body() refreshTokenDto: RefreshTokenDto,
	): Promise<{ message: string }> {
		await this.authService.logout(refreshTokenDto.refresh_token)
		return { message: 'Logged out successfully' }
	}

	/**
	 * Logout from all devices
	 */
	@Post('logout-all')
	@UseGuards(DynamicAuthGuard)
	async logoutAll(
		@Req() req: AuthenticatedRequest,
	): Promise<{ message: string }> {
		await this.authService.logoutAll(req.user.id)
		return { message: 'Logged out from all devices' }
	}

	/**
	 * Get current user info
	 */
	@UseGuards(DynamicAuthGuard)
	@Get('me')
	async me(@Req() req: AuthenticatedRequest): Promise<AuthUser> {
		try {
			// Try to get full user info from database
			const user = await this.authService.getUserById(req.user.id)
			return {
				id: user.id,
				email: user.email,
				role: user.role ?? 'user',
				name: user.name,
			}
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

	/**
	 * Get auth status (public endpoint).
	 * Returns authentication state, setup requirement, and the list of
	 * enabled OAuth providers so the admin UI can render provider buttons.
	 */
	@Get('status')
	async status(@Req() req: Request & { user?: AuthenticatedUser }): Promise<{
		authenticated: boolean
		requiresSetup?: boolean
		message?: string
		user?: AuthenticatedUser
		providers?: string[]
	}> {
		const providers = await this.authService.getEnabledOAuthProviders()

		if (req.user) {
			return { authenticated: true, user: req.user, providers }
		}

		const existingUser = await this.authService.exists()

		return {
			authenticated: false,
			requiresSetup: !existingUser,
			message: existingUser
				? 'Authentication required.'
				: 'No users found. Initial setup required.',
			providers,
		}
	}

	// ============================================================================
	// Sessions
	// ============================================================================

	/**
	 * Get active sessions
	 */
	@Get('sessions')
	@UseGuards(DynamicAuthGuard)
	async getSessions(@Req() req: AuthenticatedRequest): Promise<SessionInfo[]> {
		return this.authService.getSessions(req.user.id, req.sessionId)
	}

	/**
	 * Revoke a specific session
	 */
	@Delete('sessions/:sessionId')
	@UseGuards(DynamicAuthGuard)
	async revokeSession(
		@Req() req: AuthenticatedRequest,
		@Param('sessionId') sessionId: string,
	): Promise<{ message: string }> {
		await this.authService.revokeSession(req.user.id, sessionId)
		return { message: 'Session revoked' }
	}

	// ============================================================================
	// Password Management
	// ============================================================================

	/**
	 * Request password reset (sends email with token)
	 */
	@Post('forgot-password')
	async forgotPassword(
		@Body() forgotPasswordDto: ForgotPasswordDto,
	): Promise<{ message: string }> {
		// Always return same message to prevent email enumeration
		try {
			await this.authService.requestPasswordReset(forgotPasswordDto.email)
		} catch {
			// Swallow errors to prevent email enumeration
		}
		return {
			message:
				'If an account exists with that email, a password reset link has been sent.',
		}
	}

	/**
	 * Reset password with token
	 */
	@Post('reset-password')
	async resetPassword(
		@Body() resetPasswordDto: ResetPasswordDto,
	): Promise<{ message: string }> {
		await this.authService.resetPassword(
			resetPasswordDto.token,
			resetPasswordDto.password,
		)
		return {
			message:
				'Password reset successfully. Please login with your new password.',
		}
	}

	/**
	 * Change password (authenticated)
	 */
	@UseGuards(DynamicAuthGuard)
	@Put('account/password')
	async changePassword(
		@Req() req: AuthenticatedRequest,
		@Body() changePasswordDto: ChangePasswordDto,
	): Promise<{ message: string }> {
		return this.authService.changePassword(req.user.id, changePasswordDto)
	}

	// ============================================================================
	// Profile
	// ============================================================================

	/**
	 * Update user profile
	 */
	@UseGuards(DynamicAuthGuard)
	@Put('account/profile')
	async updateProfile(
		@Req() req: AuthenticatedRequest,
		@Body() updateProfileDto: UpdateProfileDto,
	): Promise<{
		id: string
		email: string
		name: string
		role: string | undefined
	}> {
		return this.authService.updateProfile(req.user.id, updateProfileDto)
	}

	// ============================================================================
	// Helpers
	// ============================================================================

	/**
	 * Extract request context for auth operations
	 */
	private getRequestContext(req: Request): RequestContext {
		return {
			ipAddress: req.ip ?? req.socket?.remoteAddress,
			userAgent: req.headers['user-agent'],
		}
	}
}
