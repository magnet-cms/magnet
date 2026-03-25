import { createHash, randomBytes } from 'node:crypto'

import type { Model } from '@magnet-cms/common'
import { InjectModel } from '@magnet-cms/common'
import { BadRequestException, Injectable } from '@nestjs/common'

import { EmailVerification } from './schemas/email-verification.schema'

import { MagnetLogger } from '~/modules/logging/logger.service'
import { UserService } from '~/modules/user/user.service'

/**
 * Service for managing email verification tokens.
 *
 * Follows the same security pattern as PasswordResetService:
 * - Tokens are hashed before storage (SHA-256)
 * - Tokens expire after 24 hours
 * - Each token can only be used once
 */
@Injectable()
export class EmailVerificationService {
  private readonly TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

  constructor(
    @InjectModel(EmailVerification)
    private readonly verificationModel: Model<EmailVerification>,
    private readonly userService: UserService,
    private readonly logger: MagnetLogger,
  ) {
    this.logger.setContext(EmailVerificationService.name)
  }

  /**
   * Create a verification request and return the plain token.
   */
  async createVerificationRequest(
    userId: string,
    email: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex')
    const tokenHash = this.hashToken(token)
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MS)

    await this.verificationModel.create({
      userId,
      email,
      tokenHash,
      expiresAt,
      used: false,
    })

    this.logger.debug(`Email verification token created for user ${userId}`)
    return { token, expiresAt }
  }

  /**
   * Verify an email using a token.
   * Marks the token as used and sets emailVerified on the user.
   */
  async verify(token: string): Promise<{ userId: string; email: string }> {
    const tokenHash = this.hashToken(token)

    const record = await this.verificationModel.findOne({
      tokenHash,
      used: false,
    })

    if (!record) {
      throw new BadRequestException('Invalid or expired verification token')
    }

    if (new Date() > record.expiresAt) {
      throw new BadRequestException('Verification token has expired')
    }

    // Mark token as used
    await this.verificationModel.update({ tokenHash }, { used: true })

    // Mark user email as verified
    await this.userService.update(record.userId, { emailVerified: true })

    this.logger.log(`Email verified for user ${record.userId} (${record.email})`)

    return { userId: record.userId, email: record.email }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
