import { IsNotEmpty, IsString } from 'class-validator'

export class CreateTest9DB0253CDto {
	@IsString()
	@IsNotEmpty()
	title: string
}
