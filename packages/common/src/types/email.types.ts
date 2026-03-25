// ============================================================================
// Email Template Types
// ============================================================================

/**
 * Category for grouping email templates.
 * Extensible with custom string values.
 */
export type EmailTemplateCategory = 'transactional' | 'marketing' | 'system' | (string & {})

/**
 * A single historical version entry stored in the EmailTemplate.versions array.
 * Capped at 5 entries per template.
 */
export interface EmailTemplateVersionEntry {
  /** Subject line at time of edit */
  subject: string
  /** HTML body at time of edit */
  body: string
  /** User ID who made the edit */
  editedBy: string
  /** ISO date string of when the edit occurred */
  editedAt: string
}

// ============================================================================
// Email Configuration Types
// ============================================================================

/**
 * SMTP configuration for Nodemailer adapter
 */
export interface NodemailerConfig {
  /** SMTP server hostname */
  host: string
  /** SMTP server port (default: 587) */
  port?: number
  /** Use TLS (default: true for port 465, false otherwise) */
  secure?: boolean
  /** SMTP authentication credentials */
  auth: {
    /** SMTP username */
    user: string
    /** SMTP password */
    pass: string
  }
  /** Connection timeout in milliseconds */
  connectionTimeout?: number
  /** Greeting timeout in milliseconds */
  greetingTimeout?: number
  /** Socket timeout in milliseconds */
  socketTimeout?: number
}

/**
 * Resend API configuration
 */
export interface ResendConfig {
  /** Resend API key */
  apiKey: string
}

/**
 * Email adapter name type — extensible for custom adapters
 */
export type EmailAdapterName = 'nodemailer' | 'resend' | (string & {})

/**
 * Email system configuration for MagnetModuleOptions
 */
export interface EmailConfig {
  /** Which email adapter to use */
  adapter: EmailAdapterName
  /** Nodemailer SMTP configuration (when adapter is 'nodemailer') */
  nodemailer?: NodemailerConfig
  /** Resend API configuration (when adapter is 'resend') */
  resend?: ResendConfig
  /** Default email settings */
  defaults?: {
    /** Default sender email address */
    from?: string
    /** Default reply-to address */
    replyTo?: string
  }
}

// ============================================================================
// Email Send Types
// ============================================================================

/**
 * Email attachment
 */
export interface EmailAttachment {
  /** Attachment filename */
  filename: string
  /** Attachment content (Buffer, string, or URL) */
  content: Buffer | string
  /** MIME type of the attachment */
  contentType?: string
  /** Content disposition (default: 'attachment') */
  disposition?: 'attachment' | 'inline'
  /** Content ID for inline attachments */
  cid?: string
}

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  /** Recipient email address(es) */
  to: string | string[]
  /** Sender email address (overrides default) */
  from?: string
  /** Email subject line */
  subject: string
  /** HTML body content */
  html?: string
  /** Plain text body content */
  text?: string
  /** Reply-to address (overrides default) */
  replyTo?: string
  /** CC recipients */
  cc?: string | string[]
  /** BCC recipients */
  bcc?: string | string[]
  /** Email attachments */
  attachments?: EmailAttachment[]
  /** Custom headers */
  headers?: Record<string, string>
  /** Tags for categorization (supported by some providers) */
  tags?: Array<{ name: string; value: string }>
}

/**
 * Result of sending an email
 */
export interface SendEmailResult {
  /** Provider-assigned message ID */
  id?: string
  /** Whether the email was accepted for delivery */
  accepted: boolean
  /** List of accepted recipient addresses */
  acceptedAddresses?: string[]
  /** List of rejected recipient addresses */
  rejectedAddresses?: string[]
  /** Error message if sending failed */
  error?: string
}

// ============================================================================
// Email Adapter Abstract Class
// ============================================================================

/**
 * Abstract base class for email adapters.
 *
 * All email providers must extend this class and implement the abstract methods.
 * Follows the same pattern as `StorageAdapter` and `DatabaseAdapter`.
 *
 * @example
 * ```typescript
 * export class NodemailerEmailAdapter extends EmailAdapter {
 *   readonly name = 'nodemailer'
 *
 *   async send(options: SendEmailOptions): Promise<SendEmailResult> {
 *     // Send via SMTP using Nodemailer
 *   }
 *
 *   async sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
 *     return Promise.all(emails.map(email => this.send(email)))
 *   }
 *
 *   async verify(): Promise<boolean> {
 *     // Test SMTP connection
 *   }
 * }
 * ```
 */
export abstract class EmailAdapter {
  /**
   * Unique identifier for this adapter
   */
  abstract readonly name: string

  /**
   * Send a single email
   * @param options - Email send options (to, subject, html, etc.)
   * @returns Result with delivery status
   */
  abstract send(options: SendEmailOptions): Promise<SendEmailResult>

  /**
   * Send multiple emails in batch
   * @param emails - Array of email options
   * @returns Array of results (one per email)
   */
  abstract sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResult[]>

  /**
   * Verify the adapter connection/configuration
   * @returns true if the adapter is properly configured and can send emails
   */
  abstract verify(): Promise<boolean>

  /**
   * Optional cleanup/disconnect method
   */
  async dispose?(): Promise<void>
}
