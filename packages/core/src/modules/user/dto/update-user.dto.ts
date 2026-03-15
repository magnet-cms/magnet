import { IsEmail, IsOptional, IsString, Length } from 'class-validator'

export class UpdateUserDto {
	@IsEmail()
	@IsOptional()
	email?: string

	@IsString()
	@Length(6, 100)
	@IsOptional()
	password?: string | null

	@IsString()
	@Length(2, 100)
	@IsOptional()
	name?: string

	@IsString()
	@IsOptional()
	role?: string

	@IsString()
	@IsOptional()
	provider?: string | null

	@IsString()
	@IsOptional()
	providerId?: string | null
}
