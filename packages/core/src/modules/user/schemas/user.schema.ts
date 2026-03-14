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

	/** Null for OAuth-only users who have never set a local password */
	@Field.Text({ required: false, hidden: true })
	@Field.Validators(IsString(), Length(6, 100), IsOptional())
	password?: string | null

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

	/** OAuth provider name (e.g. 'google', 'github'). Null for local-only users. */
	@Field.Text({ hidden: true })
	@Field.Validators(IsString(), IsOptional())
	provider?: string | null

	/** OAuth provider user ID. Null for local-only users. */
	@Field.Text({ hidden: true })
	@Field.Validators(IsString(), IsOptional())
	providerId?: string | null

	@Field.Boolean({ default: true })
	isActive?: boolean

	@Field.Boolean({ default: false, hidden: true })
	emailVerified?: boolean

	@Field.Date({ hidden: true })
	lastLogin?: Date

	@Field.DateTime({ default: () => new Date(), hidden: true })
	createdAt?: Date

	async hashPassword() {
		if (this.password) {
			this.password = await hash(this.password, 10)
		}
	}
}
