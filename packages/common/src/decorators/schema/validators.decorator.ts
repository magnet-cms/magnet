import { applyDecorators } from '@nestjs/common'

export const Validators = (...validators: PropertyDecorator[]) => {
  return applyDecorators(...validators)
}
