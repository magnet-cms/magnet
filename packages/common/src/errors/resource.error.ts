import { ErrorCode, ErrorMetadata, MagnetError } from './base.error'

/**
 * Resource not found error
 * Generic error for any resource type
 */
export class ResourceNotFoundError extends MagnetError {
  readonly code = ErrorCode.RESOURCE_NOT_FOUND
  readonly httpStatus = 404

  constructor(resourceType: string, identifier: string, metadata?: ErrorMetadata) {
    super(`${resourceType} with identifier '${identifier}' not found`, {
      ...metadata,
      resourceId: identifier,
    })
  }
}

/**
 * Schema not found error
 * Thrown when a schema/collection doesn't exist
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
 * Thrown when a document doesn't exist in a schema
 */
export class DocumentNotFoundError extends MagnetError {
  readonly code = ErrorCode.DOCUMENT_NOT_FOUND
  readonly httpStatus = 404

  constructor(schema: string, id: string, metadata?: ErrorMetadata) {
    super(`Document '${id}' not found in ${schema}`, {
      ...metadata,
      schema,
      resourceId: id,
    })
  }
}

/**
 * User not found error
 */
export class UserNotFoundError extends MagnetError {
  readonly code = ErrorCode.USER_NOT_FOUND
  readonly httpStatus = 404

  constructor(identifier: string, metadata?: ErrorMetadata) {
    super(`User '${identifier}' not found`, {
      ...metadata,
      resourceId: identifier,
    })
  }
}

/**
 * File not found error
 */
export class FileNotFoundError extends MagnetError {
  readonly code = ErrorCode.FILE_NOT_FOUND
  readonly httpStatus = 404

  constructor(path: string, metadata?: ErrorMetadata) {
    super(`File '${path}' not found`, {
      ...metadata,
      resourceId: path,
    })
  }
}

/**
 * Version not found error
 * Thrown when a specific version of a document doesn't exist
 */
export class VersionNotFoundError extends MagnetError {
  readonly code = ErrorCode.VERSION_NOT_FOUND
  readonly httpStatus = 404

  constructor(schema: string, documentId: string, versionId: string, metadata?: ErrorMetadata) {
    super(`Version '${versionId}' not found for document '${documentId}' in ${schema}`, {
      ...metadata,
      schema,
      resourceId: documentId,
      context: { versionId },
    })
  }
}
