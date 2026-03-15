import { IsNotEmpty, IsString } from 'class-validator'

export class CreateTest0153F022Dto {
	@IsString()
	@IsNotEmpty()
	title: string
}
