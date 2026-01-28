import { Field, Prop, Schema } from '@magnet-cms/common'
import { Prop as MgProp } from '@nestjs/mongoose'
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
import { SchemaTypes } from 'mongoose'

@Schema()
export class Cat {
	// Versioning/i18n fields - required for content management
	@MgProp({ type: String, required: true, index: true })
	documentId: string

	@MgProp({ type: String, required: true, default: 'en' })
	locale: string

	@MgProp({
		type: String,
		required: true,
		default: 'draft',
		enum: ['draft', 'published', 'archived'],
	})
	status: 'draft' | 'published' | 'archived'

	@MgProp({ type: Date, default: null })
	publishedAt: Date | null

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

	// Many-to-One relation with Owner
	@Prop({
		type: SchemaTypes.ObjectId,
		ref: 'Owner',
		required: true,
	})
	@Field.Relationship({
		ref: 'Owner',
		tab: 'Relations',
		description: 'Cat owner',
	})
	@Field.Validators(IsNotEmpty())
	owner!: string

	// Many-to-Many relation with Veterinarian
	@Prop({
		type: [SchemaTypes.ObjectId],
		ref: 'Veterinarian',
		required: false,
		default: [],
	})
	@Field.Relationship({
		ref: 'Veterinarian',
		tab: 'Relations',
		description: 'Veterinarians treating this cat',
	})
	@Field.Validators(IsOptional())
	veterinarians?: string[]

	// One-to-One relation with Media (main photo)
	@Prop({
		type: SchemaTypes.ObjectId,
		ref: 'Media',
		required: false,
	})
	@Field.Image({ tab: 'Media', description: 'Main photo' })
	@Field.Validators(IsOptional())
	photo?: string

	// One-to-Many relation with Media (gallery)
	@Prop({
		type: [SchemaTypes.ObjectId],
		ref: 'Media',
		required: false,
		default: [],
	})
	@Field.Image({ tab: 'Media', description: 'Additional photos' })
	@Field.Validators(IsOptional())
	photos?: string[]

	// Note: medicalRecords is a virtual relation (One-to-Many from MedicalRecord.cat)
	// Accessed via reverse populate in queries

	@Field.Boolean({
		required: true,
		tab: 'General',
		description: 'Is the cat castrated?',
	})
	@Field.Validators(IsBoolean())
	castrated: boolean
}
