import { IsNotEmpty, IsString } from 'class-validator'

export class CreateTest17002FCDDto {
	@IsString()
	@IsNotEmpty()
	title: string
}
