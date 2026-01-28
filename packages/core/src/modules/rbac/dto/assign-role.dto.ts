import {
	IsNotEmpty,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator'

/**
 * DTO for assigning a role to a user
 */
export class AssignRoleDto {
	/**
	 * Role name (slug) to assign
	 */
	@IsString()
	@IsNotEmpty()
	@MinLength(2)
	@MaxLength(50)
	@Matches(/^[a-z][a-z0-9-]*$/, {
		message: 'Invalid role name format',
	})
	roleName!: string
}
