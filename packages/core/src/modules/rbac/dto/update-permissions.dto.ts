import { ArrayUnique, IsArray, IsString } from 'class-validator'

/**
 * DTO for updating role permissions
 */
export class UpdatePermissionsDto {
	/**
	 * Array of permission IDs to set
	 * This replaces all existing permissions
	 */
	@IsArray()
	@ArrayUnique()
	@IsString({ each: true })
	permissions!: string[]
}
