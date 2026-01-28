import { Field, Schema } from '@magnet-cms/common'
import { Prop as MgProp } from '@nestjs/mongoose'
import { Type } from 'class-transformer'
import {
	IsDate,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	Length,
	Min,
} from 'class-validator'
import { SchemaTypes } from 'mongoose'

@Schema()
export class MedicalRecord {
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

	// Many-to-One relation with Cat
	@MgProp({
		type: SchemaTypes.ObjectId,
		ref: 'Cat',
		required: true,
	})
	@Field.Relationship({
		ref: 'Cat',
		tab: 'Relations',
		description: 'Cat this record belongs to',
	})
	@Field.Validators(IsNotEmpty())
	cat!: string

	// Many-to-One relation with Veterinarian
	@MgProp({
		type: SchemaTypes.ObjectId,
		ref: 'Veterinarian',
		required: false,
	})
	@Field.Relationship({
		ref: 'Veterinarian',
		tab: 'Relations',
		description: 'Veterinarian who performed this record',
	})
	@Field.Validators(IsOptional())
	veterinarian?: string

	@Type(() => Date)
	@Field.Date({ required: true, tab: 'General', row: true })
	@Field.Validators(IsDate(), IsNotEmpty())
	date!: Date

	@Field.Select({
		required: true,
		tab: 'General',
		row: true,
		options: [
			{ label: 'Checkup', value: 'checkup' },
			{ label: 'Vaccination', value: 'vaccination' },
			{ label: 'Surgery', value: 'surgery' },
			{ label: 'Treatment', value: 'treatment' },
			{ label: 'Emergency', value: 'emergency' },
		],
	})
	@Field.Validators(IsString(), Length(2, 50), IsNotEmpty())
	type!: string

	@Field.Text({ required: true, tab: 'General' })
	@Field.Validators(IsString(), Length(10, 1000), IsNotEmpty())
	description!: string

	@Field.Number({ required: false, tab: 'General' })
	@Field.Validators(IsNumber(), Min(0), IsOptional())
	cost?: number

	@Field.Tags({ required: false, tab: 'General' })
	@Field.Validators(IsOptional())
	medications?: string[]
}
