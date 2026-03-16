import { Field, Schema } from '@magnet-cms/common'
import { Type } from 'class-transformer'
import {
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

@Schema()
export class Cat {
	@Field.Text({ unique: true, required: true, tab: 'General', row: true })
	@Field.Validators(IsString(), Length(10, 20), IsNotEmpty())
	tagID: string

	@Field.Text({
		required: true,
		intl: true,
		tab: 'General',
		row: true,
		description: 'Cat name',
	})
	@Field.Validators(IsString(), Length(2, 255), IsNotEmpty())
	name: string

	@Type(() => Date)
	@Field.Date({ required: true, tab: 'General', row: true })
	@Field.Validators(IsDate(), IsNotEmpty())
	birthdate: Date

	@Field.Text({
		required: true,
		intl: true,
		tab: 'General',
		description: 'Breed of the cat',
	})
	@Field.Validators(IsString(), Length(2, 50), IsNotEmpty())
	breed: string

	@Field.Text({
		required: false,
		intl: true,
		tab: 'General',
		description: 'Additional description',
	})
	@Field.Validators(IsString(), IsOptional())
	description?: string

	@Field.Number({
		required: true,
		tab: 'General',
		description: 'Weight in kg',
	})
	@Field.Validators(IsNumber(), Min(0.5), Max(15), IsNotEmpty())
	weight: number

	// Many-to-One relation with Owner (using UUID/string for drizzle)
	@Field.Relationship({
		ref: 'Owner',
		required: true,
		tab: 'Relations',
		description: 'Cat owner',
	})
	@Field.Validators(IsNotEmpty())
	owner!: string

	// Many-to-Many relation with Veterinarian (array of UUIDs for drizzle)
	@Field.Relationship({
		ref: 'Veterinarian',
		required: false,
		default: [],
		tab: 'Relations',
		description: 'Veterinarians treating this cat',
	})
	@Field.Validators(IsOptional())
	veterinarians?: string[]

	// One-to-One relation with Media (main photo)
	@Field.Image({
		required: false,
		tab: 'Media',
		description: 'Main photo',
	})
	@Field.Validators(IsOptional())
	photo?: string

	// One-to-Many relation with Media (gallery)
	@Field.Image({
		required: false,
		default: [],
		tab: 'Media',
		description: 'Additional photos',
	})
	@Field.Validators(IsOptional())
	photos?: string[]

	@Field.Boolean({
		required: true,
		tab: 'General',
		description: 'Is the cat castrated?',
	})
	@Field.Validators(IsBoolean())
	castrated: boolean
}
