import type { EventPayload, SendEmailOptions, SendEmailResult } from '@magnet-cms/common'
import { OnEvent } from '@magnet-cms/common'
import { Inject, Injectable, OnModuleInit, forwardRef } from '@nestjs/common'
import Handlebars from 'handlebars'

import type { ConsoleEmailAdapter } from './adapters/console-email.adapter'
import { EmailTemplateService } from './email-template.service'
import { EmailVerificationService } from './email-verification.service'
import { EmailSettings } from './email.settings'
import { TemplateService } from './template.service'

import { AuthSettings } from '~/modules/auth/auth.settings'
import { GeneralSettings } from '~/modules/general/general.settings'
import { MagnetLogger } from '~/modules/logging/logger.service'
import { SettingsService } from '~/modules/settings/settings.service'

/** Injection token for the email adapter instance */
export const EMAIL_ADAPTER_TOKEN = 'EMAIL_ADAPTER'

/**
 * Core email service for sending templated and raw emails.
 *
 * Wraps the configured email adapter with template rendering,
 * default settings, and error handling. The adapter is always a
 * `ConsoleEmailAdapter` that wraps the real adapter (if configured),
 * ensuring emails are always at least logged.
 */
@Injectable()
export class EmailService implements OnModuleInit {
  private defaultFrom = ''
  private defaultReplyTo: string | undefined
  private appUrl = 'http://localhost:3000'

  constructor(
    private readonly logger: MagnetLogger,
    private readonly templateService: TemplateService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly settingsService: SettingsService,
    @Inject(forwardRef(() => EmailVerificationService))
    private readonly verificationService: EmailVerificationService,
    @Inject(EMAIL_ADAPTER_TOKEN)
    private readonly adapter: ConsoleEmailAdapter,
  ) {
    this.logger.setContext(EmailService.name)

    if (!this.adapter.hasInnerAdapter()) {
      this.logger.debug('No email adapter configured. Emails will be logged to console only.')
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
      })
    } catch {
      this.logger.debug('EmailSettings not available, using defaults')
    }

    // Load base URL from General settings
    try {
      const general = await this.settingsService.get(GeneralSettings)
      if (general.baseUrl) {
        this.appUrl = general.baseUrl
      }
    } catch {
      this.logger.debug('GeneralSettings not available, using default app URL')
    }

    // Verify adapter connection on startup (non-blocking)
    const ok = await this.verify()
    if (ok) {
      this.logger.log('Email adapter connection verified')
    } else {
      this.logger.warn('Email adapter connection verification failed — emails may not be delivered')
    }
  }

  /**
   * Update default settings (called by EmailSettings integration).
   */
  setDefaults(options: { from?: string; replyTo?: string }): void {
    if (options.from) this.defaultFrom = options.from
    if (options.replyTo) this.defaultReplyTo = options.replyTo
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
   * @deprecated Use `sendTemplate(slug, { to, data })` instead. Templates are now
   * stored in the database and managed via the Admin UI. This method still resolves
   * templates from DB (via TemplateService) but uses the caller-provided subject
   * rather than the template's subject. Migrate callers to sendTemplate() to benefit
   * from locale resolution and subject Handlebars compilation.
   *
   * @param to - Recipient email address(es)
   * @param subject - Email subject (overrides template subject)
   * @param templateName - Template slug (previously a .hbs filename without extension)
   * @param context - Template variables
   * @returns Send result or null if template renders empty
   */
  async send(
    to: string | string[],
    subject: string,
    templateName: string,
    context: Record<string, unknown> = {},
  ): Promise<SendEmailResult | null> {
    const html = await this.templateService.render(templateName, {
      ...context,
      appUrl: this.appUrl,
    })

    if (!html) {
      this.logger.warn(`Template '${templateName}' rendered empty content, skipping send`)
      return null
    }

    return this.sendRaw({
      to,
      subject,
      html,
    })
  }

  /**
   * Send an email using a DB-managed template by slug.
   *
   * Fetches the template from the database, compiles subject and body
   * with Handlebars, wraps body in the configured layout, and dispatches.
   *
   * @param slug - Template slug (e.g. 'welcome', 'password-reset')
   * @param options - Recipient, data variables, locale, and optional overrides
   * @returns Send result or null if template not found
   */
  async sendTemplate(
    slug: string,
    options: {
      to: string | string[]
      data?: Record<string, unknown>
      locale?: string
      from?: string
      replyTo?: string
    },
  ): Promise<SendEmailResult | null> {
    const data = { ...options.data, appUrl: this.appUrl }

    const template = await this.emailTemplateService.findBySlug(slug, options.locale)
    if (!template) {
      this.logger.warn(`Email template '${slug}' not found — email not sent`)
      return null
    }

    const subject = Handlebars.compile(template.subject)(data)
    const html = await this.templateService.render(slug, data, options.locale)

    if (!html) {
      this.logger.warn(`Template '${slug}' rendered empty content — email not sent`)
      return null
    }

    return this.sendRaw({
      to: options.to,
      subject,
      html,
      from: options.from,
      replyTo: options.replyTo,
    })
  }

  /**
   * Send a raw email without template rendering.
   *
   * @param options - Full email options
   * @returns Send result
   */
  async sendRaw(options: SendEmailOptions): Promise<SendEmailResult> {
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
    try {
      return await this.adapter.verify()
    } catch {
      return false
    }
  }

  /**
   * Check if a real email adapter (not just console) is configured.
   */
  isConfigured(): boolean {
    return this.adapter.hasInnerAdapter()
  }

  // -------------------------------------------------------------------------
  // Event Handlers — Transactional Emails
  // -------------------------------------------------------------------------

  @OnEvent('user.email_verification_requested', { async: true })
  async onEmailVerificationRequested(
    payload: EventPayload<'user.email_verification_requested'>,
  ): Promise<void> {
    if (!payload.email || !payload.verificationToken) return

    try {
      const verifyLink = `${this.appUrl}/api/email/verify?token=${payload.verificationToken}`
      await this.sendTemplate('email-verification', {
        to: payload.email,
        data: {
          verifyLink,
          userName: payload.name || payload.email.split('@')[0],
        },
      })
    } catch (error) {
      this.logger.warn(
        `Failed to send verification email: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  @OnEvent('user.registered', { async: true })
  async onUserRegistered(payload: EventPayload<'user.registered'>): Promise<void> {
    if (!payload.email) return

    try {
      // Send welcome email
      const loginUrl = `${this.appUrl}/login`
      await this.sendTemplate('welcome', {
        to: payload.email,
        data: {
          userName: payload.name || payload.email.split('@')[0],
          loginUrl,
        },
      })

      // Trigger email verification if enabled
      try {
        const authSettings = await this.settingsService.get(AuthSettings)
        if (authSettings.requireEmailVerification && payload.targetUserId) {
          const { token } = await this.verificationService.createVerificationRequest(
            payload.targetUserId,
            payload.email,
          )
          const verifyLink = `${this.appUrl}/api/email/verify?token=${token}`
          await this.sendTemplate('email-verification', {
            to: payload.email,
            data: {
              verifyLink,
              userName: payload.name || payload.email.split('@')[0],
            },
          })
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
    if (!payload.plainToken || !payload.email) return

    try {
      const resetLink = `${this.appUrl}/auth/reset-password?token=${payload.plainToken}`
      await this.sendTemplate('password-reset', {
        to: payload.email,
        data: {
          resetLink,
          userName: payload.email.split('@')[0],
        },
      })
    } catch (error) {
      this.logger.warn(
        `Failed to send password reset email: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}
