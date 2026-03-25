import { describe, expect, it } from 'vitest'

import {
  AccountLockedError,
  AuthenticationRequiredError,
  EmailNotVerifiedError,
  InsufficientPermissionsError,
  InvalidCredentialsError,
  PermissionDeniedError,
  PermissionNotFoundError,
  RoleNotFoundError,
  TokenExpiredError,
  TokenInvalidError,
} from '../auth.error'
import { ErrorCode, MagnetError } from '../base.error'
import {
  ConnectionFailedError,
  DatabaseError,
  DuplicateKeyError,
  QueryFailedError,
  TransactionFailedError,
} from '../database.error'
import { fromDrizzleError, fromMongooseError, isMagnetError, wrapError } from '../factory'
import {
  DocumentNotFoundError,
  FileNotFoundError,
  ResourceNotFoundError,
  SchemaNotFoundError,
  UserNotFoundError,
  VersionNotFoundError,
} from '../resource.error'
import {
  InvalidFormatError,
  RequiredFieldError,
  ValidationError,
  ValueOutOfRangeError,
} from '../validation.error'

// ─── MagnetError base ───────────────────────────────────────────────────────

describe('MagnetError (base)', () => {
  it('is an instance of Error', () => {
    const err = new AuthenticationRequiredError()
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(MagnetError)
  })

  it('sets name to constructor name', () => {
    expect(new AuthenticationRequiredError().name).toBe('AuthenticationRequiredError')
    expect(new DatabaseError('fail').name).toBe('DatabaseError')
  })

  it('sets timestamp to a Date', () => {
    const err = new AuthenticationRequiredError()
    expect(err.timestamp).toBeInstanceOf(Date)
  })

  it('stores metadata', () => {
    const err = new DocumentNotFoundError('Article', 'doc-1', {
      operation: 'read',
    })
    expect(err.metadata.schema).toBe('Article')
    expect(err.metadata.resourceId).toBe('doc-1')
    expect(err.metadata.operation).toBe('read')
  })

  it('toResponse returns correct structure', () => {
    const err = new AuthenticationRequiredError('Not logged in')
    const res = err.toResponse()
    expect(res.error.code).toBe(ErrorCode.AUTHENTICATION_REQUIRED)
    expect(res.error.message).toBe('Not logged in')
    expect(res.error.name).toBe('AuthenticationRequiredError')
    expect(typeof res.error.timestamp).toBe('string')
  })

  it('toJSON includes all fields', () => {
    const err = new DatabaseError('db fail')
    const json = err.toJSON()
    expect(json.name).toBe('DatabaseError')
    expect(json.code).toBe(ErrorCode.DATABASE_ERROR)
    expect(json.httpStatus).toBe(500)
    expect(typeof json.timestamp).toBe('string')
  })
})

// ─── Auth errors ─────────────────────────────────────────────────────────────

describe('Auth errors', () => {
  it('AuthenticationRequiredError: code=2000, httpStatus=401', () => {
    const err = new AuthenticationRequiredError()
    expect(err.code).toBe(ErrorCode.AUTHENTICATION_REQUIRED)
    expect(err.httpStatus).toBe(401)
    expect(err.message).toBe('Authentication required')
  })

  it('InvalidCredentialsError: code=2001, httpStatus=401', () => {
    const err = new InvalidCredentialsError()
    expect(err.code).toBe(ErrorCode.INVALID_CREDENTIALS)
    expect(err.httpStatus).toBe(401)
  })

  it('TokenExpiredError: code=2002, httpStatus=401', () => {
    const err = new TokenExpiredError()
    expect(err.code).toBe(ErrorCode.TOKEN_EXPIRED)
    expect(err.httpStatus).toBe(401)
  })

  it('TokenInvalidError: code=2003, httpStatus=401', () => {
    const err = new TokenInvalidError()
    expect(err.code).toBe(ErrorCode.TOKEN_INVALID)
    expect(err.httpStatus).toBe(401)
  })

  it('AccountLockedError: code=2004, httpStatus=423, stores unlockAt', () => {
    const unlock = new Date()
    const err = new AccountLockedError('Locked', unlock)
    expect(err.code).toBe(ErrorCode.ACCOUNT_LOCKED)
    expect(err.httpStatus).toBe(423)
    expect(err.unlockAt).toBe(unlock)
  })

  it('EmailNotVerifiedError: code=2005, httpStatus=403', () => {
    const err = new EmailNotVerifiedError()
    expect(err.code).toBe(ErrorCode.EMAIL_NOT_VERIFIED)
    expect(err.httpStatus).toBe(403)
  })

  it('PermissionDeniedError: code=3000, stores requiredPermission', () => {
    const err = new PermissionDeniedError('Denied', 'content:publish')
    expect(err.code).toBe(ErrorCode.PERMISSION_DENIED)
    expect(err.httpStatus).toBe(403)
    expect(err.requiredPermission).toBe('content:publish')
  })

  it('InsufficientPermissionsError: lists required permissions', () => {
    const err = new InsufficientPermissionsError(['admin', 'editor'])
    expect(err.code).toBe(ErrorCode.INSUFFICIENT_PERMISSIONS)
    expect(err.requiredPermissions).toEqual(['admin', 'editor'])
    expect(err.message).toContain('admin')
  })

  it('RoleNotFoundError: code=3002', () => {
    const err = new RoleNotFoundError('superuser')
    expect(err.code).toBe(ErrorCode.ROLE_NOT_FOUND)
    expect(err.message).toContain('superuser')
  })

  it('PermissionNotFoundError: stores invalid IDs', () => {
    const err = new PermissionNotFoundError(['perm-1', 'perm-2'])
    expect(err.code).toBe(ErrorCode.PERMISSION_NOT_FOUND)
    expect(err.invalidPermissionIds).toEqual(['perm-1', 'perm-2'])
  })
})

// ─── Database errors ──────────────────────────────────────────────────────────

describe('Database errors', () => {
  it('DatabaseError: code=5000, httpStatus=500, stores originalError', () => {
    const orig = new Error('db issue')
    const err = new DatabaseError('Database failed', orig)
    expect(err.code).toBe(ErrorCode.DATABASE_ERROR)
    expect(err.httpStatus).toBe(500)
    expect(err.originalError).toBe(orig)
  })

  it('ConnectionFailedError: code=5001, httpStatus=503', () => {
    const err = new ConnectionFailedError()
    expect(err.code).toBe(ErrorCode.CONNECTION_FAILED)
    expect(err.httpStatus).toBe(503)
  })

  it('QueryFailedError: code=5002, stores query', () => {
    const err = new QueryFailedError('Query failed', 'SELECT * FROM users')
    expect(err.code).toBe(ErrorCode.QUERY_FAILED)
    expect(err.query).toBe('SELECT * FROM users')
  })

  it('TransactionFailedError: code=5003', () => {
    const err = new TransactionFailedError()
    expect(err.code).toBe(ErrorCode.TRANSACTION_FAILED)
  })

  it('DuplicateKeyError: code=5004, httpStatus=409, includes field in message', () => {
    const err = new DuplicateKeyError('email', 'test@example.com')
    expect(err.code).toBe(ErrorCode.DUPLICATE_KEY)
    expect(err.httpStatus).toBe(409)
    expect(err.message).toContain('email')
    expect(err.message).toContain('test@example.com')
  })
})

// ─── Resource errors ──────────────────────────────────────────────────────────

describe('Resource errors', () => {
  it('ResourceNotFoundError: code=4000, httpStatus=404', () => {
    const err = new ResourceNotFoundError('Article', 'abc-123')
    expect(err.code).toBe(ErrorCode.RESOURCE_NOT_FOUND)
    expect(err.httpStatus).toBe(404)
    expect(err.message).toContain('abc-123')
    expect(err.metadata.resourceId).toBe('abc-123')
  })

  it('SchemaNotFoundError: code=4001, metadata includes schema', () => {
    const err = new SchemaNotFoundError('BlogPost')
    expect(err.code).toBe(ErrorCode.SCHEMA_NOT_FOUND)
    expect(err.metadata.schema).toBe('BlogPost')
  })

  it('DocumentNotFoundError: code=4002, includes schema and id', () => {
    const err = new DocumentNotFoundError('Article', 'doc-99')
    expect(err.code).toBe(ErrorCode.DOCUMENT_NOT_FOUND)
    expect(err.metadata.schema).toBe('Article')
    expect(err.metadata.resourceId).toBe('doc-99')
  })

  it('UserNotFoundError: code=4003', () => {
    const err = new UserNotFoundError('user@example.com')
    expect(err.code).toBe(ErrorCode.USER_NOT_FOUND)
    expect(err.message).toContain('user@example.com')
  })

  it('FileNotFoundError: code=4004', () => {
    const err = new FileNotFoundError('/uploads/photo.jpg')
    expect(err.code).toBe(ErrorCode.FILE_NOT_FOUND)
  })

  it('VersionNotFoundError: code=4005, includes versionId in context', () => {
    const err = new VersionNotFoundError('Article', 'doc-1', 'v-42')
    expect(err.code).toBe(ErrorCode.VERSION_NOT_FOUND)
    expect(err.message).toContain('v-42')
    expect(err.metadata.context?.versionId).toBe('v-42')
  })
})

// ─── Validation errors ────────────────────────────────────────────────────────

describe('Validation errors', () => {
  it('ValidationError: code=1000, httpStatus=400, stores details', () => {
    const details = [{ field: 'title', message: 'Title is required' }]
    const err = new ValidationError('Validation failed', details)
    expect(err.code).toBe(ErrorCode.VALIDATION_FAILED)
    expect(err.httpStatus).toBe(400)
    expect(err.details).toEqual(details)
  })

  it('ValidationError.toResponse includes details', () => {
    const details = [{ field: 'slug', message: 'Slug must be unique', constraint: 'unique' }]
    const err = new ValidationError('Invalid', details)
    const res = err.toResponse()
    expect(res.error.details).toHaveLength(1)
    expect(res.error.details![0]!.field).toBe('slug')
  })

  it('ValidationError.fromClassValidator converts class-validator errors', () => {
    const classValidatorErrors = [
      {
        property: 'email',
        value: 'not-an-email',
        constraints: {
          isEmail: 'email must be an email',
          isNotEmpty: 'email must not be empty',
        },
      },
    ]
    const err = ValidationError.fromClassValidator(classValidatorErrors)
    expect(err.details).toHaveLength(2)
    expect(err.details.some((d) => d.field === 'email')).toBe(true)
  })

  it('RequiredFieldError: code=1001, field in metadata', () => {
    const err = new RequiredFieldError('title')
    expect(err.code).toBe(ErrorCode.REQUIRED_FIELD_MISSING)
    expect(err.metadata.field).toBe('title')
  })

  it('InvalidFormatError: code=1002, includes field and format in message', () => {
    const err = new InvalidFormatError('url', 'https://...')
    expect(err.code).toBe(ErrorCode.INVALID_FORMAT)
    expect(err.message).toContain('url')
    expect(err.message).toContain('https://...')
  })

  it('ValueOutOfRangeError: code=1003, min only', () => {
    const err = new ValueOutOfRangeError('age', 18)
    expect(err.code).toBe(ErrorCode.VALUE_OUT_OF_RANGE)
    expect(err.message).toContain('18')
  })

  it('ValueOutOfRangeError: min and max', () => {
    const err = new ValueOutOfRangeError('rating', 1, 5)
    expect(err.message).toContain('1')
    expect(err.message).toContain('5')
  })

  it('ValueOutOfRangeError: max only', () => {
    const err = new ValueOutOfRangeError('quantity', undefined, 100)
    expect(err.message).toContain('100')
  })
})

// ─── Factory functions ────────────────────────────────────────────────────────

describe('fromMongooseError', () => {
  it('converts CastError on _id to DocumentNotFoundError', () => {
    const castError = { name: 'CastError', path: '_id', value: 'invalid-id' }
    const err = fromMongooseError(castError, { schema: 'Article' })
    expect(err).toBeInstanceOf(DocumentNotFoundError)
    expect(err.metadata.schema).toBe('Article')
  })

  it('converts duplicate key error to DuplicateKeyError', () => {
    const dupError = { code: 11000, keyValue: { email: 'test@example.com' } }
    const err = fromMongooseError(dupError)
    expect(err).toBeInstanceOf(DuplicateKeyError)
    expect(err.message).toContain('email')
  })

  it('converts Mongoose ValidationError to ValidationError', () => {
    const mongooseValidation = {
      name: 'ValidationError',
      errors: {
        title: { message: 'Path `title` is required.' },
      },
    }
    const err = fromMongooseError(mongooseValidation)
    expect(err).toBeInstanceOf(ValidationError)
  })

  it('falls back to DatabaseError for unknown errors', () => {
    const err = fromMongooseError(new Error('unknown db error'))
    expect(err).toBeInstanceOf(DatabaseError)
    expect(err.message).toBe('unknown db error')
  })
})

describe('fromDrizzleError', () => {
  it('converts postgres unique constraint to DuplicateKeyError', () => {
    const pgError = {
      code: '23505',
      detail: 'Key (email)=(test@example.com) already exists.',
    }
    const err = fromDrizzleError(pgError, { schema: 'User' })
    expect(err).toBeInstanceOf(DuplicateKeyError)
    expect(err.message).toContain('email')
  })

  it('converts "no result" error to DocumentNotFoundError', () => {
    const err = fromDrizzleError(new Error('no result'))
    expect(err).toBeInstanceOf(DocumentNotFoundError)
  })

  it('falls back to DatabaseError for unknown errors', () => {
    const err = fromDrizzleError(new Error('connection timeout'))
    expect(err).toBeInstanceOf(DatabaseError)
  })
})

describe('isMagnetError', () => {
  it('returns true for MagnetError instances', () => {
    expect(isMagnetError(new AuthenticationRequiredError())).toBe(true)
    expect(isMagnetError(new DatabaseError('fail'))).toBe(true)
  })

  it('returns false for plain errors', () => {
    expect(isMagnetError(new Error('plain'))).toBe(false)
    expect(isMagnetError('string error')).toBe(false)
    expect(isMagnetError(null)).toBe(false)
  })
})

describe('wrapError', () => {
  it('returns MagnetError unchanged', () => {
    const original = new DatabaseError('db fail')
    expect(wrapError(original)).toBe(original)
  })

  it('wraps plain Error in DatabaseError', () => {
    const err = wrapError(new Error('oops'))
    expect(err).toBeInstanceOf(DatabaseError)
    expect(err.message).toBe('oops')
  })

  it('wraps non-Error with fallback message', () => {
    const err = wrapError('something went wrong', 'Fallback message')
    expect(err).toBeInstanceOf(DatabaseError)
    expect(err.message).toBe('Fallback message')
  })
})
