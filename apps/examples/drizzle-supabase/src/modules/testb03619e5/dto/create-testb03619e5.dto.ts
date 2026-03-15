import { IsNotEmpty, IsString } from 'class-validator'

export class CreateTestB03619E5Dto {
	@IsString()
	@IsNotEmpty()
	title: string
}
