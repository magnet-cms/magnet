import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
} from 'class-validator'

export class CreateUserDto {
	@IsString()
	@IsOptional()
	id?: string

	@IsEmail()
	@IsNotEmpty()
	email!: string

	@IsString()
	@Length(6, 100)
	@IsOptional()
	password?: string | null

	@IsString()
	@Length(2, 100)
	@IsNotEmpty()
	name!: string

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
