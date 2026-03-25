import { IsNotEmpty, IsString, MinLength } from 'class-validator'

/**
 * DTO for password reset requests
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string
}
