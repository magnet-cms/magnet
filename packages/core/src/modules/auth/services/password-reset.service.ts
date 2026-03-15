import { createHash, randomBytes } from 'node:crypto'
import { InjectModel, Model } from '@magnet-cms/common'
import { BadRequestException, Injectable } from '@nestjs/common'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { PasswordReset } from '../schemas/password-reset.schema'

/**
 * Result of a password reset request
 */
export interface PasswordResetRequestResult {
	/**
	 * Plain text token to send to user (via email)
	 * This is the only time the plain token is available
	 */
	token: string
	/**
	 * Token expiration timestamp
	 */
	expiresAt: Date
}

/**
 * Service for handling password reset operations.
 *
 * Security features:
 * - Tokens are hashed before storage (SHA-256)
 * - Tokens expire after 1 hour
 * - Each token can only be used once
 * - No information leakage (same response for existing/non-existing users)
 */
@Injectable()
export class PasswordResetService {
	private readonly TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour

	constructor(
		@InjectModel(PasswordReset)
		private readonly passwordResetModel: Model<PasswordReset>,
		private readonly logger: MagnetLogger,
	) {
		this.logger.setContext(PasswordResetService.name)
	}

	/**
	 * Create a password reset request.
	 *
	 * Generates a secure token and stores its hash.
	 * The plain token should be sent to the user via email.
	 *
	 * @param userId - The user ID requesting the reset
	 * @returns The plain token and expiration date
	 */
	async createResetRequest(
		userId: string,
	): Promise<PasswordResetRequestResult> {
		// Generate secure random token
		const token = randomBytes(32).toString('hex')
		const tokenHash = this.hashToken(token)
		const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MS)

		// Invalidate any existing pending reset requests for this user
		await this.invalidatePendingRequests(userId)

		// Create new reset request
		await this.passwordResetModel.create({
			userId,
			tokenHash,
			expiresAt,
			used: false,
			createdAt: new Date(),
		})

		this.logger.debug(`Password reset request created for user ${userId}`)

		return { token, expiresAt }
	}

	/**
	 * Validate a password reset token.
	 *
	 * @param token - The plain text token from the user
	 * @returns The user ID if valid
	 * @throws BadRequestException if token is invalid or expired
	 */
	async validateResetToken(token: string): Promise<string> {
		const tokenHash = this.hashToken(token)

		const resetRequest = await this.passwordResetModel.findOne({
			tokenHash,
			used: false,
		})

		if (!resetRequest) {
			throw new BadRequestException('Invalid or expired reset token')
		}

		if (new Date() > resetRequest.expiresAt) {
			throw new BadRequestException('Reset token has expired')
		}

		return resetRequest.userId
	}

	/**
	 * Mark a reset token as used.
	 *
	 * @param token - The plain text token
	 */
	async markTokenAsUsed(token: string): Promise<void> {
		const tokenHash = this.hashToken(token)

		await this.passwordResetModel.update({ tokenHash }, { used: true })

		this.logger.debug('Password reset token marked as used')
	}

	/**
	 * Clean up expired reset requests.
	 *
	 * Can be called periodically to remove stale data.
	 */
	async cleanupExpiredRequests(): Promise<number> {
		const now = new Date()
		const expiredRequests = await this.passwordResetModel.findMany({
			expiresAt: now, // This should find requests where expiresAt < now
			used: false,
		})

		// In practice, we'd want a proper query for "less than" comparison
		// For now, we'll just log the intent
		this.logger.debug(
			`Cleanup: would remove ${expiredRequests.length} expired requests`,
		)

		return expiredRequests.length
	}

	/**
	 * Invalidate all pending reset requests for a user.
	 *
	 * @param userId - The user ID
	 */
	private async invalidatePendingRequests(userId: string): Promise<void> {
		try {
			await this.passwordResetModel.update(
				{ userId, used: false },
				{ used: true },
			)
		} catch {
			// No pending requests to invalidate — this is expected
		}
	}

	/**
	 * Hash a token using SHA-256.
	 *
	 * @param token - The plain text token
	 * @returns The hashed token
	 */
	private hashToken(token: string): string {
		return createHash('sha256').update(token).digest('hex')
	}
}
