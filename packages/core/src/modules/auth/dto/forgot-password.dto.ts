import { IsEmail, IsNotEmpty } from 'class-validator'

/**
 * DTO for forgot password requests
 */
export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string
}
