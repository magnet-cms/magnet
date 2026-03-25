import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

/**
 * DTO for login requests
 */
export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string
}
