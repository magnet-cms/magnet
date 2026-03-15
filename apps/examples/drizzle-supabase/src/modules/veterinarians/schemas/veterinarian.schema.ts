import { Field, Schema } from '@magnet-cms/common'
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator'

@Schema()
export class Veterinarian {
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
}
