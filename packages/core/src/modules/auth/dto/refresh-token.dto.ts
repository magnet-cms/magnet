import { IsNotEmpty, IsString } from 'class-validator'

/**
 * DTO for refresh token requests
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refresh_token!: string
}
