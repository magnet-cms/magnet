import { ErrorCode, ErrorMetadata, MagnetError } from './base.error'

/**
 * Authentication required error
 * Thrown when a request requires authentication but none is provided
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
 * Thrown when email/password combination is incorrect
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
 * Thrown when a JWT or refresh token has expired
 */
export class TokenExpiredError extends MagnetError {
	readonly code = ErrorCode.TOKEN_EXPIRED
	readonly httpStatus = 401

	constructor(message = 'Token has expired', metadata?: ErrorMetadata) {
		super(message, metadata)
	}
}

/**
 * Token invalid error
 * Thrown when a JWT or refresh token is malformed or invalid
 */
export class TokenInvalidError extends MagnetError {
	readonly code = ErrorCode.TOKEN_INVALID
	readonly httpStatus = 401

	constructor(message = 'Token is invalid', metadata?: ErrorMetadata) {
		super(message, metadata)
	}
}

/**
 * Account locked error
 * Thrown when an account is temporarily locked due to too many failed attempts
 */
export class AccountLockedError extends MagnetError {
	readonly code = ErrorCode.ACCOUNT_LOCKED
	readonly httpStatus = 423
	readonly unlockAt?: Date

	constructor(
		message = 'Account is temporarily locked',
		unlockAt?: Date,
		metadata?: ErrorMetadata,
	) {
		super(message, metadata)
		this.unlockAt = unlockAt
	}
}

/**
 * Email not verified error
 * Thrown when an action requires email verification
 */
export class EmailNotVerifiedError extends MagnetError {
	readonly code = ErrorCode.EMAIL_NOT_VERIFIED
	readonly httpStatus = 403

	constructor(
		message = 'Email address not verified',
		metadata?: ErrorMetadata,
	) {
		super(message, metadata)
	}
}

/**
 * Permission denied error
 * Thrown when user lacks permission for an action
 */
export class PermissionDeniedError extends MagnetError {
	readonly code = ErrorCode.PERMISSION_DENIED
	readonly httpStatus = 403
	readonly requiredPermission?: string

	constructor(
		message = 'You do not have permission to perform this action',
		requiredPermission?: string,
		metadata?: ErrorMetadata,
	) {
		super(message, metadata)
		this.requiredPermission = requiredPermission
	}
}

/**
 * Insufficient permissions error
 * Thrown when user has some permissions but not enough
 */
export class InsufficientPermissionsError extends MagnetError {
	readonly code = ErrorCode.INSUFFICIENT_PERMISSIONS
	readonly httpStatus = 403
	readonly requiredPermissions: string[]

	constructor(requiredPermissions: string[], metadata?: ErrorMetadata) {
		super(
			`Insufficient permissions. Required: ${requiredPermissions.join(', ')}`,
			metadata,
		)
		this.requiredPermissions = requiredPermissions
	}
}

/**
 * Role not found error
 */
export class RoleNotFoundError extends MagnetError {
	readonly code = ErrorCode.ROLE_NOT_FOUND
	readonly httpStatus = 404

	constructor(roleName: string, metadata?: ErrorMetadata) {
		super(`Role '${roleName}' not found`, metadata)
	}
}

/**
 * Permission not found error
 * Thrown when assigning invalid permission IDs to a role
 */
export class PermissionNotFoundError extends MagnetError {
	readonly code = ErrorCode.PERMISSION_NOT_FOUND
	readonly httpStatus = 400
	readonly invalidPermissionIds: string[]

	constructor(invalidPermissionIds: string[], metadata?: ErrorMetadata) {
		super(
			`Invalid permission(s): ${invalidPermissionIds.join(', ')}. These permissions are not registered in the system.`,
			{
				...metadata,
				context: {
					...metadata?.context,
					invalidPermissionIds,
				},
			},
		)
		this.invalidPermissionIds = invalidPermissionIds
	}
}
