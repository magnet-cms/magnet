import { ValidationError } from '@nestjs/common'

export class ValidationException extends Error {
  public constructor(public readonly errors: ValidationError[]) {
    super('ValidationException')
  }
}
