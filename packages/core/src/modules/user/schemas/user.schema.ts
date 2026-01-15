import { Prop, Schema, UI, Validators } from '@magnet/common'
import { hash } from 'bcryptjs'
import {
	IsEmail,
	IsNotEmpty,
	IsOptional,
	IsString,
	Length,
} from 'class-validator'

@Schema({ versioning: false, i18n: false })
export class User {
	@Prop({ required: true, unique: true })
	@Validators(IsEmail(), IsNotEmpty())
	@UI({ tab: 'General', type: 'email', row: true })
	email!: string

	@Prop({ required: true })
	@Validators(IsString(), Length(6, 100), IsNotEmpty())
	password!: string

	@Prop({ required: true })
	@Validators(IsString(), Length(2, 100), IsNotEmpty())
	@UI({ tab: 'General', row: true })
	name!: string

	@Prop({ required: false })
	@Validators(IsString(), IsOptional())
	@UI({
		tab: 'General',
		type: 'select',
		options: [
			{ key: 'admin', value: 'Admin' },
			{ key: 'editor', value: 'Editor' },
			{ key: 'viewer', value: 'Viewer' },
		],
	})
	role?: string

	async hashPassword() {
		this.password = await hash(this.password, 10)
	}
}
