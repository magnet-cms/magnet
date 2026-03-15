/**
 * Injection token for webhook module options.
 */
export const WEBHOOK_MODULE_OPTIONS = 'WEBHOOK_MODULE_OPTIONS'

/**
 * Default retry delays in milliseconds for failed webhook deliveries.
 */
export const DEFAULT_RETRY_DELAYS = [1_000, 5_000, 30_000]

/**
 * Default request timeout in milliseconds.
 */
export const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Maximum response body length stored in delivery logs (bytes).
 */
export const MAX_RESPONSE_BODY_LENGTH = 1024

/**
 * HMAC signature header name sent on outgoing webhook requests.
 */
export const SIGNATURE_HEADER = 'X-Magnet-Signature'
