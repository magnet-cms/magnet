import { ErrorCode, ErrorMetadata, MagnetError } from './base.error'

/**
 * Generic external service error
 */
export class ExternalServiceError extends MagnetError {
  readonly code = ErrorCode.EXTERNAL_SERVICE_ERROR
  readonly httpStatus = 502

  constructor(serviceName: string, message: string, metadata?: ErrorMetadata) {
    super(`External service '${serviceName}' error: ${message}`, metadata)
  }
}

/**
 * Storage service error
 */
export class StorageError extends MagnetError {
  readonly code = ErrorCode.STORAGE_ERROR
  readonly httpStatus = 502

  constructor(message: string, metadata?: ErrorMetadata) {
    super(`Storage error: ${message}`, metadata)
  }
}

/**
 * Email service error
 */
export class EmailServiceError extends MagnetError {
  readonly code = ErrorCode.EMAIL_SERVICE_ERROR
  readonly httpStatus = 502

  constructor(message: string, metadata?: ErrorMetadata) {
    super(`Email service error: ${message}`, metadata)
  }
}

/**
 * Webhook delivery error
 */
export class WebhookDeliveryError extends MagnetError {
  readonly code = ErrorCode.WEBHOOK_DELIVERY_FAILED
  readonly httpStatus = 502
  readonly webhookUrl: string
  readonly statusCode?: number

  constructor(webhookUrl: string, reason: string, statusCode?: number, metadata?: ErrorMetadata) {
    super(`Webhook delivery to '${webhookUrl}' failed: ${reason}`, metadata)
    this.webhookUrl = webhookUrl
    this.statusCode = statusCode
  }
}
