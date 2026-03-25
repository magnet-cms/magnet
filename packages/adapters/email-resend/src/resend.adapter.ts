import type {
  EmailMagnetProvider,
  EnvVarRequirement,
  ResendConfig,
  SendEmailOptions,
  SendEmailResult,
} from '@magnet-cms/common'
import { EmailAdapter } from '@magnet-cms/common'
import { Resend } from 'resend'
import type { CreateEmailOptions } from 'resend'

/**
 * Resend-based email adapter using the Resend API.
 *
 * Uses the official Resend SDK for reliable email delivery via API.
 *
 * @example
 * ```typescript
 * const adapter = new ResendEmailAdapter({
 *   apiKey: 're_xxxxxxxxxxxx',
 * })
 * ```
 */
export class ResendEmailAdapter extends EmailAdapter {
  readonly name = 'resend'
  private readonly client: Resend

  /** Environment variables used by this adapter */
  static readonly envVars: EnvVarRequirement[] = [
    { name: 'RESEND_API_KEY', required: true, description: 'Resend API key' },
    {
      name: 'EMAIL_FROM',
      required: false,
      description: 'Default sender email address',
    },
  ]

  /**
   * Create a configured email provider for MagnetModule.forRoot().
   * Auto-resolves config values from environment variables if not provided.
   *
   * @example
   * ```typescript
   * MagnetModule.forRoot([
   *   ResendEmailAdapter.forRoot(),
   *   // or with explicit config:
   *   ResendEmailAdapter.forRoot({
   *     apiKey: 're_xxxxxxxxxxxx',
   *     defaults: { from: 'noreply@example.com' },
   *   }),
   * ])
   * ```
   */
  static forRoot(config?: {
    apiKey?: string
    defaults?: { from?: string; replyTo?: string }
  }): EmailMagnetProvider {
    const resolvedConfig: ResendConfig = {
      apiKey: config?.apiKey ?? process.env.RESEND_API_KEY ?? '',
    }

    const defaults =
      config?.defaults ?? (process.env.EMAIL_FROM ? { from: process.env.EMAIL_FROM } : undefined)

    return {
      type: 'email',
      adapter: new ResendEmailAdapter(resolvedConfig),
      defaults,
      envVars: ResendEmailAdapter.envVars,
    }
  }

  constructor(config: ResendConfig) {
    super()
    this.client = new Resend(config.apiKey)
  }

  private buildPayload(options: SendEmailOptions): CreateEmailOptions {
    // Resend requires at least one content field (html or text)
    return {
      from: options.from ?? '',
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html ?? options.text ?? '',
      text: options.text,
      replyTo: options.replyTo
        ? Array.isArray(options.replyTo)
          ? options.replyTo
          : [options.replyTo]
        : undefined,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      headers: options.headers,
      tags: options.tags,
      attachments: options.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content instanceof Buffer ? att.content : Buffer.from(att.content),
        content_type: att.contentType,
      })),
    }
  }

  async send(options: SendEmailOptions): Promise<SendEmailResult> {
    try {
      const { data, error } = await this.client.emails.send(this.buildPayload(options))

      if (error) {
        return {
          accepted: false,
          error: error.message,
        }
      }

      return {
        id: data?.id,
        accepted: true,
      }
    } catch (error) {
      return {
        accepted: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      }
    }
  }

  async sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
    try {
      const { data, error } = await this.client.batch.send(
        emails.map((options) => this.buildPayload(options)),
      )

      if (error) {
        return emails.map(() => ({
          accepted: false,
          error: error.message,
        }))
      }

      return (
        data?.data?.map((result) => ({
          id: result.id,
          accepted: true,
        })) ?? emails.map(() => ({ accepted: true }))
      )
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Batch send failed'
      return emails.map(() => ({ accepted: false, error: errorMsg }))
    }
  }

  async verify(): Promise<boolean> {
    try {
      // Verify API key by listing domains (lightweight API call).
      // A "restricted_api_key" error means the key authenticated successfully
      // but is scoped to sending only — it's still a valid key.
      const { error } = await this.client.domains.list()
      if (!error) return true
      return (error as { name?: string }).name === 'restricted_api_key'
    } catch {
      return false
    }
  }
}
