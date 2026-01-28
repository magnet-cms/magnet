import { Field, Schema } from '@magnet-cms/common'
import { hash } from 'bcryptjs'
import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
} from 'class-validator'

@Schema({ versioning: false, i18n: false, visible: false })
export class User {
	@Field.Email({ required: true, unique: true, tab: 'General' })
	@Field.Validators(IsEmail(), IsNotEmpty())
	email!: string

	@Field.Text({ required: true, hidden: true })
	@Field.Validators(IsString(), Length(6, 100), IsNotEmpty())
	password!: string

	@Field.Text({ required: true, tab: 'General' })
	@Field.Validators(IsString(), Length(2, 100), IsNotEmpty())
	name!: string

	@Field.Select({
		tab: 'General',
		options: [
			{ label: 'Admin', value: 'admin' },
			{ label: 'Editor', value: 'editor' },
			{ label: 'Viewer', value: 'viewer' },
		],
	})
	@Field.Validators(IsString(), IsOptional())
	role?: string

	@Field.Boolean({ default: true })
	isActive?: boolean

	@Field.Date({ hidden: true })
	lastLogin?: Date

	async hashPassword() {
		this.password = await hash(this.password, 10)
	}
}
