import {
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator'

/**
 * DTO for duplicating a role
 */
export class DuplicateRoleDto {
	/**
	 * Name for the new role (slug)
	 */
	@IsString()
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(50)
	@Matches(/^[a-z][a-z0-9-]*$/, {
		message:
			'Role name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens',
	})
	name!: string

	/**
	 * Optional display name for the new role
	 * If not provided, defaults to "Copy of [original]"
	 */
	@IsString()
	@IsOptional()
	@MinLength(2)
	@MaxLength(100)
	displayName?: string
}
