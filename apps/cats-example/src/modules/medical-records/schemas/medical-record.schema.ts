import { Prop, Schema, UI, Validators } from '@magnet-cms/common'
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
	// Many-to-One relation with Cat
	@Prop({
		type: SchemaTypes.ObjectId,
		ref: 'Cat',
		required: true,
	})
	@Validators(IsNotEmpty())
	@UI({
		tab: 'Relations',
		type: 'relationship',
		description: 'Cat this record belongs to',
	})
	cat!: string

	// Many-to-One relation with Veterinarian
	@Prop({
		type: SchemaTypes.ObjectId,
		ref: 'Veterinarian',
		required: false,
	})
	@Validators(IsOptional())
	@UI({
		tab: 'Relations',
		type: 'relationship',
		description: 'Veterinarian who performed this record',
	})
	veterinarian?: string

	@Type(() => Date)
	@Prop({ required: true })
	@Validators(IsDate(), IsNotEmpty())
	@UI({ tab: 'General', type: 'date', row: true })
	date!: Date

	@Prop({ required: true })
	@Validators(IsString(), Length(2, 50), IsNotEmpty())
	@UI({
		tab: 'General',
		type: 'select',
		options: [
			{ key: 'checkup', value: 'Checkup' },
			{ key: 'vaccination', value: 'Vaccination' },
			{ key: 'surgery', value: 'Surgery' },
			{ key: 'treatment', value: 'Treatment' },
			{ key: 'emergency', value: 'Emergency' },
		],
		row: true,
	})
	type!: string

	@Prop({ required: true })
	@Validators(IsString(), Length(10, 1000), IsNotEmpty())
	@UI({ tab: 'General' })
	description!: string

	@Prop({ required: false })
	@Validators(IsNumber(), Min(0), IsOptional())
	@UI({ tab: 'General', type: 'number' })
	cost?: number

	@Prop({ required: false, type: [String] })
	@Validators(IsOptional())
	@UI({ tab: 'General' })
	medications?: string[]
}
