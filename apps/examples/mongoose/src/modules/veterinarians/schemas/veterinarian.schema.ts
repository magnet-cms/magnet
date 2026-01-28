import { Field, Schema } from '@magnet-cms/common'
import { Prop as MgProp } from '@nestjs/mongoose'
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator'

@Schema()
export class Veterinarian {
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

	@Field.Text({ required: true, tab: 'General', row: true })
	@Field.Validators(IsString(), Length(2, 100), IsNotEmpty())
	name!: string

	@Field.Text({ required: true, tab: 'General', row: true })
	@Field.Validators(IsString(), Length(2, 200), IsNotEmpty())
	clinic!: string

	@Field.Text({ required: true, unique: true, tab: 'General' })
	@Field.Validators(IsString(), Length(5, 50), IsNotEmpty())
	licenseNumber!: string

	@Field.Select({
		required: false,
		tab: 'General',
		options: [
			{ label: 'General Practice', value: 'general' },
			{ label: 'Surgery', value: 'surgery' },
			{ label: 'Dentistry', value: 'dentistry' },
			{ label: 'Dermatology', value: 'dermatology' },
			{ label: 'Cardiology', value: 'cardiology' },
		],
	})
	@Field.Validators(IsString(), IsOptional())
	specialization?: string

	// Many-to-Many relation with Cat
	// This is handled via arrays of ObjectIds in both schemas
	// The Cat schema will have veterinarians array, and we can query both ways
}
