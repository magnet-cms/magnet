import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator'

export class CreateVersionDto {
  @IsString()
  @IsNotEmpty()
  documentId!: string

  @IsString()
  @IsNotEmpty()
  collection!: string

  @IsObject()
  @IsNotEmpty()
  data!: Record<string, unknown>

  @IsEnum(['draft', 'published', 'archived'])
  @IsOptional()
  status?: 'draft' | 'published' | 'archived'

  @IsString()
  @IsOptional()
  createdBy?: string

  @IsString()
  @IsOptional()
  notes?: string
}
