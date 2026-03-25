/**
 * MailPit REST API client for E2E email verification.
 *
 * MailPit is a lightweight SMTP server that captures all emails sent to it
 * and exposes a REST API to query received messages. This client wraps that API.
 *
 * @see https://mailpit.axllent.org/docs/api-v1/
 */

interface MailPitAddress {
  Name: string
  Address: string
}

interface MailPitMessageSummary {
  ID: string
  MessageID: string
  From: MailPitAddress
  To: MailPitAddress[]
  Cc: MailPitAddress[]
  Bcc: MailPitAddress[]
  Subject: string
  Date: string
  Size: number
  Attachments: number
  Read: boolean
  Snippet: string
}

interface MailPitMessageList {
  total: number
  unread: number
  count: number
  messages: MailPitMessageSummary[]
}

interface MailPitMessageDetail extends MailPitMessageSummary {
  HTML: string
  Text: string
}

export class MailPitClient {
  private readonly baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.MAILPIT_URL || 'http://localhost:8025'
  }

  /**
   * List all messages in the inbox.
   */
  async getMessages(limit = 50): Promise<MailPitMessageList> {
    const response = await fetch(`${this.baseUrl}/api/v1/messages?limit=${limit}`)
    if (!response.ok) {
      throw new Error(`MailPit getMessages failed: ${response.status}`)
    }
    return response.json() as Promise<MailPitMessageList>
  }

  /**
   * Search messages by query string.
   * Query syntax: https://mailpit.axllent.org/docs/usage/search-filters/
   * Examples: "to:user@example.com", "subject:Welcome", "from:noreply@"
   */
  async searchMessages(query: string): Promise<MailPitMessageList> {
    const response = await fetch(`${this.baseUrl}/api/v1/search?query=${encodeURIComponent(query)}`)
    if (!response.ok) {
      throw new Error(`MailPit searchMessages failed: ${response.status}`)
    }
    return response.json() as Promise<MailPitMessageList>
  }

  /**
   * Get full message details including HTML/text body.
   */
  async getMessage(id: string): Promise<MailPitMessageDetail> {
    const response = await fetch(`${this.baseUrl}/api/v1/message/${id}`)
    if (!response.ok) {
      throw new Error(`MailPit getMessage failed: ${response.status}`)
    }
    return response.json() as Promise<MailPitMessageDetail>
  }

  /**
   * Delete all messages from the inbox. Use between tests for isolation.
   */
  async deleteAllMessages(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/messages`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error(`MailPit deleteAllMessages failed: ${response.status}`)
    }
  }

  /**
   * Wait for a message matching the query to appear, polling until timeout.
   * Returns the first matching message or throws if timeout exceeded.
   */
  async waitForMessage(
    query: string,
    timeoutMs = 10_000,
    intervalMs = 500,
  ): Promise<MailPitMessageSummary> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.searchMessages(query)
      if (result.messages.length > 0) {
        return result.messages[0]
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }

    throw new Error(`MailPit: No message matching "${query}" found within ${timeoutMs}ms`)
  }
}
