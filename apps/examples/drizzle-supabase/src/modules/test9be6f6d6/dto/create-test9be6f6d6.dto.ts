import { IsNotEmpty, IsString } from 'class-validator'

export class CreateTest9BE6F6D6Dto {
	@IsString()
	@IsNotEmpty()
	title: string
}
