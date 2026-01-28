import {
	ArrayUnique,
	IsArray,
	IsNotEmpty,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator'

/**
 * DTO for creating a new role
 */
export class CreateRoleDto {
	/**
	 * Role slug (lowercase, no spaces)
	 * Must start with a letter, can contain letters, numbers, and hyphens
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
	 * Human-readable display name
	 */
	@IsString()
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(100)
	displayName!: string

	/**
	 * Optional description
	 */
	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string

	/**
	 * Initial permissions to assign
	 */
	@IsArray()
	@IsOptional()
	@ArrayUnique()
	@IsString({ each: true })
	permissions?: string[]
}
