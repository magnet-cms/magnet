import { IsNotEmpty, IsString } from 'class-validator'

export class CreateTest9FFD8D62Dto {
	@IsString()
	@IsNotEmpty()
	title: string
}
