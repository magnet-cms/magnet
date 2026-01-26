# Plan 000a: Error Handling Infrastructure

**Status:** ✅ Completed
**Priority:** Critical
**Estimated Effort:** 1 week
**Depends on:** Plan 000 (Type Safety Remediation)

---

## Summary

Implement a comprehensive, type-safe error handling system with domain-specific error classes, consistent error responses, and proper error propagation throughout the application.

---

## Problem Statement

### Current Issues

1. **Generic Error Usage**
   - Most code throws `new Error('message')` without context
   - No way to differentiate error types programmatically

2. **Unsafe Error Catching**
   ```typescript
   // Current pattern - unsafe
   catch (error: any) {
     if (error.name === 'CastError') { ... }
   }
   ```

3. **Inconsistent Error Responses**
   - Different modules return errors in different formats
   - No standard error response structure for API consumers

4. **Missing Error Context**
   - Errors lack metadata (schema name, field name, operation type)
   - Hard to debug and trace issues

5. **No Error Codes**
   - Clients can't reliably handle specific error conditions
   - Internationalization of error messages is impossible

---

## Proposed Solution

### 1. Base Error Classes

```typescript
// packages/common/src/errors/base.error.ts

/**
 * Error codes for programmatic error handling
 */
export enum ErrorCode {
  // Validation errors (1xxx)
  VALIDATION_FAILED = 1000,
  REQUIRED_FIELD_MISSING = 1001,
  INVALID_FORMAT = 1002,
  VALUE_OUT_OF_RANGE = 1003,
  UNIQUE_CONSTRAINT_VIOLATION = 1004,

  // Authentication errors (2xxx)
  AUTHENTICATION_REQUIRED = 2000,
  INVALID_CREDENTIALS = 2001,
  TOKEN_EXPIRED = 2002,
  TOKEN_INVALID = 2003,
  ACCOUNT_LOCKED = 2004,
  EMAIL_NOT_VERIFIED = 2005,

  // Authorization errors (3xxx)
  PERMISSION_DENIED = 3000,
  INSUFFICIENT_PERMISSIONS = 3001,
  ROLE_NOT_FOUND = 3002,

  // Resource errors (4xxx)
  RESOURCE_NOT_FOUND = 4000,
  SCHEMA_NOT_FOUND = 4001,
  DOCUMENT_NOT_FOUND = 4002,
  USER_NOT_FOUND = 4003,
  FILE_NOT_FOUND = 4004,
  VERSION_NOT_FOUND = 4005,

  // Database errors (5xxx)
  DATABASE_ERROR = 5000,
  CONNECTION_FAILED = 5001,
  QUERY_FAILED = 5002,
  TRANSACTION_FAILED = 5003,
  DUPLICATE_KEY = 5004,

  // Plugin errors (6xxx)
  PLUGIN_ERROR = 6000,
  PLUGIN_NOT_FOUND = 6001,
  PLUGIN_INITIALIZATION_FAILED = 6002,
  HOOK_EXECUTION_FAILED = 6003,

  // External service errors (7xxx)
  EXTERNAL_SERVICE_ERROR = 7000,
  STORAGE_ERROR = 7001,
  EMAIL_SERVICE_ERROR = 7002,
  WEBHOOK_DELIVERY_FAILED = 7003,

  // Internal errors (9xxx)
  INTERNAL_ERROR = 9000,
  CONFIGURATION_ERROR = 9001,
  UNEXPECTED_ERROR = 9999,
}

/**
 * Error metadata for additional context
 */
export interface ErrorMetadata {
  /** Schema/collection name */
  schema?: string
  /** Field name that caused the error */
  field?: string
  /** Document/resource ID */
  resourceId?: string
  /** Operation being performed */
  operation?: 'create' | 'read' | 'update' | 'delete' | 'publish'
  /** Additional context */
  context?: Record<string, unknown>
}

/**
 * Base error class for all Magnet errors
 */
export abstract class MagnetError extends Error {
  abstract readonly code: ErrorCode
  abstract readonly httpStatus: number
  readonly timestamp: Date
  readonly metadata: ErrorMetadata

  constructor(message: string, metadata: ErrorMetadata = {}) {
    super(message)
    this.name = this.constructor.name
    this.timestamp = new Date()
    this.metadata = metadata

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert to API response format
   */
  toResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        name: this.name,
        timestamp: this.timestamp.toISOString(),
        metadata: this.metadata,
      },
    }
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
      stack: this.stack,
    }
  }
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode
    message: string
    name: string
    timestamp: string
    metadata?: ErrorMetadata
    details?: ValidationErrorDetail[]
  }
}

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string
  message: string
  constraint?: string
  value?: unknown
}
```

### 2. Domain-Specific Error Classes

```typescript
// packages/common/src/errors/validation.error.ts

import { MagnetError, ErrorCode, ErrorMetadata, ValidationErrorDetail } from './base.error'

/**
 * Validation error with field-level details
 */
export class ValidationError extends MagnetError {
  readonly code = ErrorCode.VALIDATION_FAILED
  readonly httpStatus = 400
  readonly details: ValidationErrorDetail[]

  constructor(
    message: string,
    details: ValidationErrorDetail[],
    metadata?: ErrorMetadata
  ) {
    super(message, metadata)
    this.details = details
  }

  static fromClassValidator(errors: ClassValidatorError[]): ValidationError {
    const details = errors.flatMap((error) =>
      Object.entries(error.constraints ?? {}).map(([constraint, message]) => ({
        field: error.property,
        message,
        constraint,
        value: error.value,
      }))
    )

    return new ValidationError(
      `Validation failed for ${details.length} field(s)`,
      details
    )
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

interface ClassValidatorError {
  property: string
  value?: unknown
  constraints?: Record<string, string>
  children?: ClassValidatorError[]
}
```

```typescript
// packages/common/src/errors/auth.error.ts

import { MagnetError, ErrorCode, ErrorMetadata } from './base.error'

/**
 * Authentication required error
 */
export class AuthenticationRequiredError extends MagnetError {
  readonly code = ErrorCode.AUTHENTICATION_REQUIRED
  readonly httpStatus = 401

  constructor(message = 'Authentication required', metadata?: ErrorMetadata) {
    super(message, metadata)
  }
}

/**
 * Invalid credentials error
 */
export class InvalidCredentialsError extends MagnetError {
  readonly code = ErrorCode.INVALID_CREDENTIALS
  readonly httpStatus = 401

  constructor(message = 'Invalid email or password', metadata?: ErrorMetadata) {
    super(message, metadata)
  }
}

/**
 * Token expired error
 */
export class TokenExpiredError extends MagnetError {
  readonly code = ErrorCode.TOKEN_EXPIRED
  readonly httpStatus = 401

  constructor(message = 'Token has expired', metadata?: ErrorMetadata) {
    super(message, metadata)
  }
}

/**
 * Account locked error
 */
export class AccountLockedError extends MagnetError {
  readonly code = ErrorCode.ACCOUNT_LOCKED
  readonly httpStatus = 423

  constructor(
    message = 'Account is temporarily locked',
    public readonly unlockAt?: Date,
    metadata?: ErrorMetadata
  ) {
    super(message, metadata)
  }
}

/**
 * Permission denied error
 */
export class PermissionDeniedError extends MagnetError {
  readonly code = ErrorCode.PERMISSION_DENIED
  readonly httpStatus = 403

  constructor(
    message = 'You do not have permission to perform this action',
    public readonly requiredPermission?: string,
    metadata?: ErrorMetadata
  ) {
    super(message, metadata)
  }
}
```

```typescript
// packages/common/src/errors/resource.error.ts

import { MagnetError, ErrorCode, ErrorMetadata } from './base.error'

/**
 * Resource not found error
 */
export class ResourceNotFoundError extends MagnetError {
  readonly code = ErrorCode.RESOURCE_NOT_FOUND
  readonly httpStatus = 404

  constructor(
    resourceType: string,
    identifier: string,
    metadata?: ErrorMetadata
  ) {
    super(`${resourceType} with identifier '${identifier}' not found`, {
      ...metadata,
      resourceId: identifier,
    })
  }
}

/**
 * Schema not found error
 */
export class SchemaNotFoundError extends MagnetError {
  readonly code = ErrorCode.SCHEMA_NOT_FOUND
  readonly httpStatus = 404

  constructor(schemaName: string, metadata?: ErrorMetadata) {
    super(`Schema '${schemaName}' not found`, {
      ...metadata,
      schema: schemaName,
    })
  }
}

/**
 * Document not found error
 */
export class DocumentNotFoundError extends MagnetError {
  readonly code = ErrorCode.DOCUMENT_NOT_FOUND
  readonly httpStatus = 404

  constructor(
    schema: string,
    id: string,
    metadata?: ErrorMetadata
  ) {
    super(`Document '${id}' not found in ${schema}`, {
      ...metadata,
      schema,
      resourceId: id,
    })
  }
}
```

```typescript
// packages/common/src/errors/database.error.ts

import { MagnetError, ErrorCode, ErrorMetadata } from './base.error'

/**
 * Generic database error
 */
export class DatabaseError extends MagnetError {
  readonly code = ErrorCode.DATABASE_ERROR
  readonly httpStatus = 500

  constructor(
    message: string,
    public readonly originalError?: unknown,
    metadata?: ErrorMetadata
  ) {
    super(message, metadata)
  }
}

/**
 * Duplicate key error
 */
export class DuplicateKeyError extends MagnetError {
  readonly code = ErrorCode.DUPLICATE_KEY
  readonly httpStatus = 409

  constructor(
    field: string,
    value: unknown,
    metadata?: ErrorMetadata
  ) {
    super(`A record with ${field} '${String(value)}' already exists`, {
      ...metadata,
      field,
    })
  }
}

/**
 * Connection failed error
 */
export class ConnectionFailedError extends MagnetError {
  readonly code = ErrorCode.CONNECTION_FAILED
  readonly httpStatus = 503

  constructor(
    message = 'Database connection failed',
    metadata?: ErrorMetadata
  ) {
    super(message, metadata)
  }
}
```

```typescript
// packages/common/src/errors/plugin.error.ts

import { MagnetError, ErrorCode, ErrorMetadata } from './base.error'

/**
 * Plugin not found error
 */
export class PluginNotFoundError extends MagnetError {
  readonly code = ErrorCode.PLUGIN_NOT_FOUND
  readonly httpStatus = 404

  constructor(pluginName: string, metadata?: ErrorMetadata) {
    super(`Plugin '${pluginName}' not found`, metadata)
  }
}

/**
 * Plugin initialization error
 */
export class PluginInitializationError extends MagnetError {
  readonly code = ErrorCode.PLUGIN_INITIALIZATION_FAILED
  readonly httpStatus = 500

  constructor(
    pluginName: string,
    reason: string,
    metadata?: ErrorMetadata
  ) {
    super(`Failed to initialize plugin '${pluginName}': ${reason}`, metadata)
  }
}

/**
 * Hook execution error
 */
export class HookExecutionError extends MagnetError {
  readonly code = ErrorCode.HOOK_EXECUTION_FAILED
  readonly httpStatus = 500

  constructor(
    hookName: string,
    pluginName: string,
    reason: string,
    metadata?: ErrorMetadata
  ) {
    super(`Hook '${hookName}' in plugin '${pluginName}' failed: ${reason}`, metadata)
  }
}
```

### 3. Error Factory Functions

```typescript
// packages/common/src/errors/factory.ts

import {
  isCastError,
  isDuplicateKeyError,
  isValidationError,
} from '../utils/type-guards'

import {
  MagnetError,
  DatabaseError,
  DuplicateKeyError,
  ValidationError,
  DocumentNotFoundError,
} from './index'

/**
 * Convert MongoDB/Mongoose errors to typed Magnet errors
 */
export function fromMongooseError(
  error: unknown,
  context?: { schema?: string; operation?: string }
): MagnetError {
  if (isCastError(error) && error.path === '_id') {
    return new DocumentNotFoundError(
      context?.schema ?? 'document',
      String(error.value),
      { operation: context?.operation as 'create' | 'read' | 'update' | 'delete' }
    )
  }

  if (isDuplicateKeyError(error)) {
    const field = Object.keys(error.keyValue)[0] ?? 'field'
    const value = error.keyValue[field]
    return new DuplicateKeyError(field, value, { schema: context?.schema })
  }

  if (isValidationError(error)) {
    const details = Object.entries(error.errors).map(([field, err]) => ({
      field,
      message: String((err as { message?: string }).message ?? 'Validation failed'),
    }))
    return new ValidationError('Validation failed', details, { schema: context?.schema })
  }

  return new DatabaseError(
    error instanceof Error ? error.message : 'Database operation failed',
    error,
    { schema: context?.schema }
  )
}

/**
 * Convert Drizzle errors to typed Magnet errors
 */
export function fromDrizzleError(
  error: unknown,
  context?: { schema?: string; operation?: string }
): MagnetError {
  if (error instanceof Error) {
    // PostgreSQL unique violation
    if (error.message.includes('unique constraint')) {
      const match = error.message.match(/Key \((\w+)\)=\(([^)]+)\)/)
      if (match) {
        return new DuplicateKeyError(match[1], match[2], { schema: context?.schema })
      }
    }

    // Not found
    if (error.message.includes('no result')) {
      return new DocumentNotFoundError(
        context?.schema ?? 'document',
        'unknown',
        { operation: context?.operation as 'read' }
      )
    }
  }

  return new DatabaseError(
    error instanceof Error ? error.message : 'Database operation failed',
    error,
    { schema: context?.schema }
  )
}
```

### 4. Global Exception Filter

```typescript
// packages/core/src/handlers/magnet-exception.filter.ts

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Response } from 'express'
import {
  MagnetError,
  ErrorCode,
  ErrorResponse,
} from '@magnet/common'

@Catch()
export class MagnetExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(MagnetExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest()

    const errorResponse = this.buildErrorResponse(exception)
    const status = this.getHttpStatus(exception)

    // Log error with context
    this.logger.error({
      ...errorResponse,
      path: request.url,
      method: request.method,
      userId: request.user?.id,
    })

    response.status(status).json(errorResponse)
  }

  private buildErrorResponse(exception: unknown): ErrorResponse {
    // Handle Magnet errors
    if (exception instanceof MagnetError) {
      return exception.toResponse()
    }

    // Handle NestJS HTTP exceptions
    if (exception instanceof HttpException) {
      const response = exception.getResponse()
      const message = typeof response === 'string'
        ? response
        : (response as { message?: string }).message ?? exception.message

      return {
        error: {
          code: this.mapHttpStatusToErrorCode(exception.getStatus()),
          message,
          name: exception.name,
          timestamp: new Date().toISOString(),
        },
      }
    }

    // Handle unknown errors
    const message = exception instanceof Error
      ? exception.message
      : 'An unexpected error occurred'

    return {
      error: {
        code: ErrorCode.UNEXPECTED_ERROR,
        message,
        name: 'UnexpectedError',
        timestamp: new Date().toISOString(),
      },
    }
  }

  private getHttpStatus(exception: unknown): number {
    if (exception instanceof MagnetError) {
      return exception.httpStatus
    }

    if (exception instanceof HttpException) {
      return exception.getStatus()
    }

    return HttpStatus.INTERNAL_SERVER_ERROR
  }

  private mapHttpStatusToErrorCode(status: number): ErrorCode {
    const mapping: Record<number, ErrorCode> = {
      400: ErrorCode.VALIDATION_FAILED,
      401: ErrorCode.AUTHENTICATION_REQUIRED,
      403: ErrorCode.PERMISSION_DENIED,
      404: ErrorCode.RESOURCE_NOT_FOUND,
      409: ErrorCode.DUPLICATE_KEY,
      500: ErrorCode.INTERNAL_ERROR,
    }

    return mapping[status] ?? ErrorCode.UNEXPECTED_ERROR
  }
}
```

### 5. Usage in Services

```typescript
// Example: Updated auth.service.ts

import {
  InvalidCredentialsError,
  AccountLockedError,
  DocumentNotFoundError,
  fromMongooseError,
} from '@magnet/common'

@Injectable()
export class AuthService {
  async login(credentials: LoginDto, context: RequestContext): Promise<AuthResult> {
    // Check if account is locked
    const isLocked = await this.isAccountLocked(credentials.email)
    if (isLocked.locked) {
      throw new AccountLockedError(
        'Account temporarily locked due to too many failed attempts',
        isLocked.unlockAt,
        { context: { email: credentials.email } }
      )
    }

    // Find user
    const user = await this.userService.findByEmail(credentials.email)
    if (!user) {
      throw new InvalidCredentialsError()
    }

    // Validate password
    const isValid = await this.validatePassword(credentials.password, user.password)
    if (!isValid) {
      await this.recordFailedAttempt(credentials.email)
      throw new InvalidCredentialsError()
    }

    // ... rest of login logic
  }
}

// Example: Updated mongoose.model.ts

async findById(id: string): Promise<T | null> {
  try {
    const doc = await this._model.findById(id)
    return doc ? this.mapDocument(doc) : null
  } catch (error: unknown) {
    throw fromMongooseError(error, {
      schema: this._schemaName,
      operation: 'read',
    })
  }
}
```

---

## Implementation Phases

### Phase 1: Base Infrastructure (Days 1-2)
- [ ] Create `packages/common/src/errors/base.error.ts`
- [ ] Create error codes enum
- [ ] Create error metadata interface
- [ ] Create error response interface

### Phase 2: Domain Errors (Days 2-3)
- [ ] Create validation errors
- [ ] Create auth errors
- [ ] Create resource errors
- [ ] Create database errors
- [ ] Create plugin errors
- [ ] Create barrel export `packages/common/src/errors/index.ts`

### Phase 3: Error Factories (Day 4)
- [ ] Create `fromMongooseError` factory
- [ ] Create `fromDrizzleError` factory
- [ ] Add unit tests for factories

### Phase 4: Exception Filter (Day 5)
- [ ] Create `MagnetExceptionFilter`
- [ ] Register globally in `MagnetModule`
- [ ] Test error response format

### Phase 5: Migration (Days 6-7)
- [ ] Update adapters to use error factories
- [ ] Update services to throw typed errors
- [ ] Update controllers to use typed errors
- [ ] Remove generic `throw new Error()` calls

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/common/src/errors/base.error.ts` | Base error class and codes |
| `packages/common/src/errors/validation.error.ts` | Validation errors |
| `packages/common/src/errors/auth.error.ts` | Authentication/authorization errors |
| `packages/common/src/errors/resource.error.ts` | Resource not found errors |
| `packages/common/src/errors/database.error.ts` | Database operation errors |
| `packages/common/src/errors/plugin.error.ts` | Plugin system errors |
| `packages/common/src/errors/factory.ts` | Error conversion factories |
| `packages/common/src/errors/index.ts` | Barrel export |
| `packages/core/src/handlers/magnet-exception.filter.ts` | Global exception filter |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/common/src/index.ts` | Export error classes |
| `packages/adapters/mongoose/src/mongoose.model.ts` | Use error factories |
| `packages/adapters/drizzle/src/drizzle.model.ts` | Use error factories |
| `packages/core/src/modules/auth/auth.service.ts` | Throw typed errors |
| `packages/core/src/modules/content/content.service.ts` | Throw typed errors |
| `packages/core/src/magnet.module.ts` | Register exception filter |

---

## Success Criteria

1. All error classes extend `MagnetError`
2. All errors have unique `ErrorCode`
3. Error responses follow standard format
4. `MagnetExceptionFilter` handles all error types
5. No `throw new Error('message')` in codebase
6. No `catch (error: any)` patterns
7. Client apps can handle errors by code
8. Errors include useful metadata for debugging

---

## Dependencies

- **Depends on:** Plan 000 (for type guards)
- **Blocks:** None (but enhances all other plans)
