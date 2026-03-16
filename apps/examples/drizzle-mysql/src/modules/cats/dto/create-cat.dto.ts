import { Type } from 'class-transformer'
import {
	IsArray,
	IsBoolean,
	IsDate,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Length,
	Max,
	Min,
} from 'class-validator'

export class CreateCatDto {
	@IsString()
	@Length(2, 20)
	@IsOptional()
	tagID?: string

	@IsString()
	@Length(2, 255)
	@IsNotEmpty()
	name: string

	@Type(() => Date)
	@IsDate()
	@IsNotEmpty()
	birthdate: Date

	@IsString()
	@Length(2, 50)
	@IsNotEmpty()
	breed: string

	@IsString()
	@IsOptional()
	description?: string

	@IsNumber()
	@Min(0.5)
	@Max(15)
	@IsNotEmpty()
	weight: number

	// Owner relation (ObjectId reference)
	@IsString()
	@IsNotEmpty()
	owner: string

	// Veterinarians relation (array of ObjectId references)
	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	veterinarians?: string[]

	// Media relations
	@IsString()
	@IsOptional()
	photo?: string

	@IsArray()
	@IsString({ each: true })
	@IsOptional()
	photos?: string[]

	@IsBoolean()
	@IsNotEmpty()
	castrated: boolean
}
