import type {
	EmailAdapter,
	EventPayload,
	SendEmailOptions,
	SendEmailResult,
} from '@magnet-cms/common'
import { OnEvent } from '@magnet-cms/common'
import {
	Inject,
	Injectable,
	OnModuleInit,
	Optional,
	forwardRef,
} from '@nestjs/common'
import { AuthSettings } from '~/modules/auth/auth.settings'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsService } from '~/modules/settings/settings.service'
import { EmailVerificationService } from './email-verification.service'
import { EmailSettings } from './email.settings'
import { TemplateService } from './template.service'

/** Injection token for the email adapter instance */
export const EMAIL_ADAPTER_TOKEN = 'EMAIL_ADAPTER'

/**
 * Core email service for sending templated and raw emails.
 *
 * Wraps the configured email adapter with template rendering,
 * default settings, and error handling. If no adapter is configured,
 * all send operations gracefully no-op with a warning log.
 */
@Injectable()
export class EmailService implements OnModuleInit {
	private defaultFrom = ''
	private defaultReplyTo: string | undefined
	private appUrl = 'http://localhost:3000'

	constructor(
		private readonly logger: MagnetLogger,
		private readonly templateService: TemplateService,
		private readonly settingsService: SettingsService,
		@Inject(forwardRef(() => EmailVerificationService))
		private readonly verificationService: EmailVerificationService,
		@Optional()
		@Inject(EMAIL_ADAPTER_TOKEN)
		private readonly adapter: EmailAdapter | null,
	) {
		this.logger.setContext(EmailService.name)

		if (!this.adapter) {
			this.logger.warn(
				'No email adapter configured. Email sending is disabled. Configure email in MagnetModuleOptions to enable.',
			)
		}
	}

	async onModuleInit(): Promise<void> {
		// Load email settings and apply defaults
		try {
			const settings = await this.settingsService.get(EmailSettings)
			this.setDefaults({
				from: settings.fromName
					? `${settings.fromName} <${settings.fromAddress}>`
					: settings.fromAddress,
				replyTo: settings.replyTo || undefined,
				appUrl: settings.appUrl,
			})
		} catch {
			this.logger.debug('EmailSettings not available, using defaults')
		}

		// Verify adapter connection on startup (non-blocking)
		if (this.adapter) {
			const ok = await this.verify()
			if (ok) {
				this.logger.log('Email adapter connection verified')
			} else {
				this.logger.warn(
					'Email adapter connection verification failed — emails may not be delivered',
				)
			}
		}
	}

	/**
	 * Update default settings (called by EmailSettings integration).
	 */
	setDefaults(options: {
		from?: string
		replyTo?: string
		appUrl?: string
	}): void {
		if (options.from) this.defaultFrom = options.from
		if (options.replyTo) this.defaultReplyTo = options.replyTo
		if (options.appUrl) this.appUrl = options.appUrl
	}

	/**
	 * Get the configured app URL for building links in emails.
	 */
	getAppUrl(): string {
		return this.appUrl
	}

	/**
	 * Send a templated email.
	 *
	 * @param to - Recipient email address(es)
	 * @param subject - Email subject
	 * @param templateName - Template name (without .hbs)
	 * @param context - Template variables
	 * @returns Send result or null if adapter not configured
	 */
	async send(
		to: string | string[],
		subject: string,
		templateName: string,
		context: Record<string, unknown> = {},
	): Promise<SendEmailResult | null> {
		if (!this.adapter) return null

		const html = this.templateService.render(templateName, {
			...context,
			appUrl: this.appUrl,
		})

		if (!html) {
			this.logger.warn(
				`Template '${templateName}' rendered empty content, skipping send`,
			)
			return null
		}

		return this.sendRaw({
			to,
			subject,
			html,
		})
	}

	/**
	 * Send a raw email without template rendering.
	 *
	 * @param options - Full email options
	 * @returns Send result or null if adapter not configured
	 */
	async sendRaw(options: SendEmailOptions): Promise<SendEmailResult | null> {
		if (!this.adapter) return null

		try {
			const emailOptions: SendEmailOptions = {
				...options,
				from: options.from || this.defaultFrom,
				replyTo: options.replyTo || this.defaultReplyTo,
			}

			const result = await this.adapter.send(emailOptions)

			if (result.accepted) {
				this.logger.debug(
					`Email sent successfully to ${Array.isArray(options.to) ? options.to.join(', ') : options.to} (id: ${result.id})`,
				)
			} else {
				this.logger.warn(`Email send failed: ${result.error}`)
			}

			return result
		} catch (error) {
			this.logger.error(
				`Failed to send email: ${error instanceof Error ? error.message : String(error)}`,
			)
			return {
				accepted: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			}
		}
	}

	/**
	 * Verify the email adapter connection.
	 */
	async verify(): Promise<boolean> {
		if (!this.adapter) return false
		try {
			return await this.adapter.verify()
		} catch {
			return false
		}
	}

	/**
	 * Check if email sending is available.
	 */
	isConfigured(): boolean {
		return this.adapter !== null
	}

	// -------------------------------------------------------------------------
	// Event Handlers — Transactional Emails
	// -------------------------------------------------------------------------

	@OnEvent('user.email_verification_requested', { async: true })
	async onEmailVerificationRequested(
		payload: EventPayload<'user.email_verification_requested'>,
	): Promise<void> {
		if (!this.adapter || !payload.email || !payload.verificationToken) return

		try {
			const verifyLink = `${this.appUrl}/api/email/verify?token=${payload.verificationToken}`
			await this.send(
				payload.email,
				'Verify Your Email',
				'email-verification',
				{
					verifyLink,
					userName: payload.name || payload.email.split('@')[0],
				},
			)
		} catch (error) {
			this.logger.warn(
				`Failed to send verification email: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	@OnEvent('user.registered', { async: true })
	async onUserRegistered(
		payload: EventPayload<'user.registered'>,
	): Promise<void> {
		if (!this.adapter || !payload.email) return

		try {
			// Send welcome email
			const loginUrl = `${this.appUrl}/login`
			await this.send(payload.email, 'Welcome!', 'welcome', {
				userName: payload.name || payload.email.split('@')[0],
				loginUrl,
			})

			// Trigger email verification if enabled
			try {
				const authSettings = await this.settingsService.get(AuthSettings)
				if (authSettings.requireEmailVerification && payload.targetUserId) {
					const { token } =
						await this.verificationService.createVerificationRequest(
							payload.targetUserId,
							payload.email,
						)
					const verifyLink = `${this.appUrl}/api/email/verify?token=${token}`
					await this.send(
						payload.email,
						'Verify Your Email',
						'email-verification',
						{
							verifyLink,
							userName: payload.name || payload.email.split('@')[0],
						},
					)
				}
			} catch (error) {
				this.logger.warn(
					`Failed to send verification email: ${error instanceof Error ? error.message : String(error)}`,
				)
			}
		} catch (error) {
			this.logger.warn(
				`Failed to send welcome email: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}

	@OnEvent('user.password_reset_requested', { async: true })
	async onPasswordResetRequested(
		payload: EventPayload<'user.password_reset_requested'>,
	): Promise<void> {
		if (!this.adapter || !payload.plainToken || !payload.email) return

		try {
			const resetLink = `${this.appUrl}/auth/reset-password?token=${payload.plainToken}`
			await this.send(payload.email, 'Reset Your Password', 'password-reset', {
				resetLink,
				userName: payload.email.split('@')[0],
			})
		} catch (error) {
			this.logger.warn(
				`Failed to send password reset email: ${error instanceof Error ? error.message : String(error)}`,
			)
		}
	}
}
