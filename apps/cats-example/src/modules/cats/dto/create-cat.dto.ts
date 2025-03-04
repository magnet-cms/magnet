import { Type } from 'class-transformer'
import {
	IsBoolean,
	IsDate,
	IsInt,
	IsNotEmpty,
	IsNumber,
	IsPhoneNumber,
	IsString,
	Length,
	Max,
	Min,
} from 'class-validator'

export class CreateCatDto {
	@IsString()
	@Length(2, 20)
	@IsNotEmpty()
	tagID: string

	@IsString()
	@Length(2, 255)
	@IsNotEmpty()
	name: string

	@IsInt()
	@Min(0)
	@Max(30)
	@IsNotEmpty()
	age: number

	@Type(() => Date)
	@IsDate()
	@IsNotEmpty()
	birthdate: Date

	@IsString()
	@Length(2, 20)
	@IsNotEmpty()
	breed: string

	@IsNumber()
	@Min(0.5)
	@Max(15)
	@IsNotEmpty()
	weight: number

	@IsString()
	@Length(3, 255)
	@IsNotEmpty()
	owner: string

	@IsPhoneNumber(null)
	@IsNotEmpty()
	ownerPhone: string

	@IsBoolean()
	@IsNotEmpty()
	castrated: boolean
}
