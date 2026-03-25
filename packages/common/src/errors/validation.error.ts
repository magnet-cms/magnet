import {
  ErrorCode,
  ErrorMetadata,
  ErrorResponse,
  MagnetError,
  ValidationErrorDetail,
} from './base.error'

/**
 * Interface for class-validator error format
 */
interface ClassValidatorError {
  property: string
  value?: unknown
  constraints?: Record<string, string>
  children?: ClassValidatorError[]
}

/**
 * Validation error with field-level details
 * Used for form validation and input validation failures
 */
export class ValidationError extends MagnetError {
  readonly code = ErrorCode.VALIDATION_FAILED
  readonly httpStatus = 400
  readonly details: ValidationErrorDetail[]

  constructor(message: string, details: ValidationErrorDetail[], metadata?: ErrorMetadata) {
    super(message, metadata)
    this.details = details
  }

  /**
   * Create ValidationError from class-validator errors
   */
  static fromClassValidator(errors: ClassValidatorError[]): ValidationError {
    const details = errors.flatMap((error) =>
      Object.entries(error.constraints ?? {}).map(([constraint, message]) => ({
        field: error.property,
        message,
        constraint,
        value: error.value,
      })),
    )

    return new ValidationError(`Validation failed for ${details.length} field(s)`, details)
  }

  override toResponse(): ErrorResponse {
    return {
      error: {
        ...super.toResponse().error,
        details: this.details,
      },
    }
  }
}

/**
 * Required field missing error
 */
export class RequiredFieldError extends MagnetError {
  readonly code = ErrorCode.REQUIRED_FIELD_MISSING
  readonly httpStatus = 400

  constructor(field: string, metadata?: ErrorMetadata) {
    super(`Required field '${field}' is missing`, {
      ...metadata,
      field,
    })
  }
}

/**
 * Invalid format error (e.g., invalid email, invalid URL)
 */
export class InvalidFormatError extends MagnetError {
  readonly code = ErrorCode.INVALID_FORMAT
  readonly httpStatus = 400

  constructor(field: string, expectedFormat: string, metadata?: ErrorMetadata) {
    super(`Field '${field}' has invalid format. Expected: ${expectedFormat}`, {
      ...metadata,
      field,
    })
  }
}

/**
 * Value out of range error
 */
export class ValueOutOfRangeError extends MagnetError {
  readonly code = ErrorCode.VALUE_OUT_OF_RANGE
  readonly httpStatus = 400

  constructor(field: string, min?: number, max?: number, metadata?: ErrorMetadata) {
    const rangeMsg =
      min !== undefined && max !== undefined
        ? `between ${min} and ${max}`
        : min !== undefined
          ? `at least ${min}`
          : max !== undefined
            ? `at most ${max}`
            : 'within valid range'

    super(`Field '${field}' must be ${rangeMsg}`, {
      ...metadata,
      field,
    })
  }
}
