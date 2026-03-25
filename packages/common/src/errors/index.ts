// Base error infrastructure
export {
  ErrorCode,
  MagnetError,
  type OperationType,
  type ErrorMetadata,
  type ErrorResponse,
  type ValidationErrorDetail,
} from './base.error'

// Validation errors
export {
  ValidationError,
  RequiredFieldError,
  InvalidFormatError,
  ValueOutOfRangeError,
} from './validation.error'

// Authentication and authorization errors
export {
  AuthenticationRequiredError,
  InvalidCredentialsError,
  TokenExpiredError,
  TokenInvalidError,
  AccountLockedError,
  EmailNotVerifiedError,
  PermissionDeniedError,
  InsufficientPermissionsError,
  RoleNotFoundError,
  PermissionNotFoundError,
} from './auth.error'

// Resource errors
export {
  ResourceNotFoundError,
  SchemaNotFoundError,
  DocumentNotFoundError,
  UserNotFoundError,
  FileNotFoundError,
  VersionNotFoundError,
} from './resource.error'

// Database errors
export {
  DatabaseError,
  ConnectionFailedError,
  QueryFailedError,
  TransactionFailedError,
  DuplicateKeyError,
} from './database.error'

// Plugin errors
export {
  PluginError,
  PluginNotFoundError,
  PluginInitializationError,
  HookExecutionError,
} from './plugin.error'

// External service errors
export {
  ExternalServiceError,
  StorageError,
  EmailServiceError,
  WebhookDeliveryError,
} from './external.error'

// Internal errors
export { InternalError, ConfigurationError, UnexpectedError } from './internal.error'

// Error factory functions
export { fromMongooseError, fromDrizzleError, isMagnetError, wrapError } from './factory'
