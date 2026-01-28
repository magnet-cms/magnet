import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

/**
 * DTO for updating a role
 */
export class UpdateRoleDto {
	/**
	 * Updated display name
	 */
	@IsString()
	@IsOptional()
	@MinLength(2)
	@MaxLength(100)
	displayName?: string

	/**
	 * Updated description
	 */
	@IsString()
	@IsOptional()
	@MaxLength(500)
	description?: string
}
