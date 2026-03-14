import type {
	EmailAttachment,
	NodemailerConfig,
	SendEmailOptions,
	SendEmailResult,
} from '@magnet-cms/common'
import { EmailAdapter } from '@magnet-cms/common'
import type { Transporter } from 'nodemailer'
import { createTransport } from 'nodemailer'

/**
 * Nodemailer-based email adapter for SMTP delivery.
 *
 * Supports any SMTP server including Gmail, SendGrid, Mailgun, AWS SES, etc.
 * Uses lazy transporter creation and connection reuse for performance.
 *
 * @example
 * ```typescript
 * const adapter = new NodemailerEmailAdapter({
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   secure: false,
 *   auth: { user: 'user@gmail.com', pass: 'app-password' },
 * })
 * ```
 */
export class NodemailerEmailAdapter extends EmailAdapter {
	readonly name = 'nodemailer'
	private transporter: Transporter | null = null
	private readonly config: NodemailerConfig

	constructor(config: NodemailerConfig) {
		super()
		this.config = config
	}

	private getTransporter(): Transporter {
		if (!this.transporter) {
			this.transporter = createTransport({
				host: this.config.host,
				port: this.config.port ?? 587,
				secure: this.config.secure,
				auth: {
					user: this.config.auth.user,
					pass: this.config.auth.pass,
				},
				connectionTimeout: this.config.connectionTimeout,
				greetingTimeout: this.config.greetingTimeout,
				socketTimeout: this.config.socketTimeout,
			})
		}
		return this.transporter
	}

	async send(options: SendEmailOptions): Promise<SendEmailResult> {
		try {
			const transporter = this.getTransporter()

			const mailOptions: Record<string, unknown> = {
				from: options.from,
				to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
				subject: options.subject,
				html: options.html,
				text: options.text,
				replyTo: options.replyTo,
				cc: options.cc,
				bcc: options.bcc,
				headers: options.headers,
			}

			if (options.attachments?.length) {
				mailOptions.attachments = options.attachments.map(
					(att: EmailAttachment) => ({
						filename: att.filename,
						content: att.content,
						contentType: att.contentType,
						contentDisposition: att.disposition,
						cid: att.cid,
					}),
				)
			}

			const info = await transporter.sendMail(mailOptions)

			return {
				id: info.messageId,
				accepted: (info.accepted?.length ?? 0) > 0,
				acceptedAddresses: info.accepted?.map(String),
				rejectedAddresses: info.rejected?.map(String),
			}
		} catch (error) {
			return {
				accepted: false,
				error: error instanceof Error ? error.message : 'Failed to send email',
			}
		}
	}

	async sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
		return Promise.all(emails.map((email) => this.send(email)))
	}

	async verify(): Promise<boolean> {
		try {
			const transporter = this.getTransporter()
			await transporter.verify()
			return true
		} catch {
			return false
		}
	}

	async dispose(): Promise<void> {
		if (this.transporter) {
			this.transporter.close()
			this.transporter = null
		}
	}
}
