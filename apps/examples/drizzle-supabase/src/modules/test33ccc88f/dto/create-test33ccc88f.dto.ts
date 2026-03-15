import { IsNotEmpty, IsString } from 'class-validator'

export class CreateTest33CCC88FDto {
	@IsString()
	@IsNotEmpty()
	title: string
}
