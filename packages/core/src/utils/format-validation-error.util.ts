import { ValidationError } from 'class-validator'

export const formatValidationErrors = (errors: ValidationError[]): Record<string, string[]> => {
  const formattedErrors: Record<string, string[]> = {}

  for (const error of errors) {
    if (error.constraints) {
      formattedErrors[error.property] = Object.values(error.constraints)
    }
    if (error.children && error.children.length > 0) {
      Object.assign(formattedErrors, formatValidationErrors(error.children))
    }
  }

  return formattedErrors
}
