import { BadRequestException, Controller, Get, Query } from '@nestjs/common'
import { EmailVerificationService } from './email-verification.service'

/**
 * Email controller for public-facing email operations.
 *
 * Provides the email verification endpoint that users click from their email.
 */
@Controller('email')
export class EmailController {
	constructor(private readonly verificationService: EmailVerificationService) {}

	/**
	 * Verify an email address using a token from the verification email.
	 *
	 * GET /email/verify?token=...
	 */
	@Get('verify')
	async verifyEmail(@Query('token') token: string) {
		if (!token) {
			throw new BadRequestException('Verification token is required')
		}

		const result = await this.verificationService.verify(token)
		return {
			success: true,
			message: 'Email verified successfully',
			email: result.email,
		}
	}
}
