import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
} from 'class-validator'

export class CreateOwnerDto {
	@IsString()
	@Length(2, 100)
	@IsNotEmpty()
	name: string

	@IsEmail()
	@IsNotEmpty()
	email: string

	@IsString()
	@Length(10, 20)
	@IsNotEmpty()
	phone: string

	@IsString()
	@IsOptional()
	address?: string
}
