import type { SendEmailOptions, SendEmailResult } from '@magnet-cms/common'
import { EmailAdapter } from '@magnet-cms/common'
import type { Logger } from '@nestjs/common'

/**
 * Built-in email adapter that logs email summaries to the console.
 *
 * Always wraps an optional inner (real) adapter:
 * - Logs a summary of every email (to/from/subject + truncated body)
 * - Delegates to the inner adapter when present
 * - Catches inner adapter failures gracefully
 * - When no inner adapter exists, emails are logged-only (accepted)
 *
 * This adapter is automatically applied by `EmailModule.forRoot()` —
 * no user configuration is required.
 */
export class ConsoleEmailAdapter extends EmailAdapter {
  readonly name: string

  constructor(
    private readonly logger: Logger,
    private readonly inner: EmailAdapter | null = null,
  ) {
    super()
    this.name = this.inner ? this.inner.name : 'console'
  }

  /**
   * Whether a real (non-console) adapter is configured.
   */
  hasInnerAdapter(): boolean {
    return this.inner !== null
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    this.logEmailSummary(options)

    if (!this.inner) {
      return { accepted: true, id: `console-${Date.now()}` }
    }

    try {
      return await this.inner.send(options)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(
        `Email adapter '${this.inner.name}' failed: ${message}. Email was logged to console.`,
      )
      return { accepted: false, error: message }
    }
  }

  async sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
    return Promise.all(emails.map((email) => this.send(email)))
  }

  async verify(): Promise<boolean> {
    if (!this.inner) return true
    try {
      return await this.inner.verify()
    } catch {
      return false
    }
  }

  async dispose(): Promise<void> {
    if (this.inner?.dispose) {
      await this.inner.dispose()
    }
  }

  private logEmailSummary(options: SendEmailOptions): void {
    const to = Array.isArray(options.to) ? options.to.join(', ') : options.to
    const body = options.html || options.text || ''
    const truncatedBody = body.length > 200 ? `${body.substring(0, 200)}...` : body

    this.logger.log(
      `[Email] To: ${to} | From: ${options.from || '(default)'} | Subject: "${options.subject}" | Body: "${truncatedBody}"`,
    )
  }
}
