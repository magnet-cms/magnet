import { Prop, Schema, UI, Validators } from '@magnet/common'
import { Type } from 'class-transformer'
import {
	IsBoolean,
	IsDate,
	IsNotEmpty,
	IsNumber,
	IsPhoneNumber,
	IsString,
	Length,
	Max,
	Min,
} from 'class-validator'

@Schema()
export class Cat {
	@Prop({ unique: true, required: true })
	@Validators(IsString(), Length(10, 20), IsNotEmpty())
	@UI({ tab: 'General', row: true })
	tagID: string

	@Prop({ required: true })
	@Validators(IsString(), Length(10, 255), IsNotEmpty())
	@UI({ tab: 'General', row: true })
	name: string

	@Type(() => Date)
	@Prop({ required: true })
	@Validators(IsDate(), IsNotEmpty())
	@UI({ tab: 'General', type: 'date', row: true })
	birthdate: Date

	@Prop({ required: true })
	@Validators(IsString(), Length(10, 20), IsNotEmpty())
	@UI({ tab: 'General' })
	breed: string

	@Prop({ required: true })
	@Validators(IsNumber(), Min(0.5), Max(15), IsNotEmpty())
	@UI({ tab: 'General', type: 'number' })
	weight: number

	@Prop({ required: true })
	@Validators(IsString(), Length(3, 255), IsNotEmpty())
	@UI({ side: true })
	owner: string

	@Prop({ required: true })
	@Validators(IsPhoneNumber(), IsNotEmpty())
	@UI({ side: true })
	ownerPhone: string

	@Prop({ required: true })
	@Validators(IsBoolean())
	@UI({ tab: 'General', type: 'switch', description: 'Is the cat castrated?' })
	castrated: boolean
}
