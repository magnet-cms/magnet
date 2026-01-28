import { Field, Schema } from '@magnet-cms/common'
import { Prop as MgProp } from '@nestjs/mongoose'
import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
} from 'class-validator'

@Schema()
export class Owner {
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

	@Field.Email({ required: true, unique: true, tab: 'General', row: true })
	@Field.Validators(IsEmail(), IsNotEmpty())
	email!: string

	@Field.Phone({ required: true, tab: 'General' })
	@Field.Validators(IsString(), Length(10, 20), IsNotEmpty())
	phone!: string

	@Field.Text({ required: false, tab: 'General' })
	@Field.Validators(IsString(), IsOptional())
	address?: string

	// Virtual relation to cats - one owner has many cats
	// This is handled via the Cat.owner field (many-to-one from Cat side)
}
