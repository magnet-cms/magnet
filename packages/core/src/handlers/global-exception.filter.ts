import { ValidationException } from '@magnet-cms/common'
import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from '@nestjs/common'
import { ValidationError } from 'class-validator'
import { formatValidationErrors } from '~/utils'

interface ExceptionResponse {
	statusCode?: number
	message?: string | string[]
	errors?: Record<string, string[]> | null
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
	catch(exception: Error, host: ArgumentsHost): void {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse()
		const request = ctx.getRequest<Request>()

		let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR
		let message: string | string[] = 'Internal server error'
		let errors: Record<string, string[]> | null = null

		if (exception instanceof ValidationError) {
			statusCode = HttpStatus.BAD_REQUEST
			message = 'Validation failed'
			errors = formatValidationErrors([exception])
		}

		if (exception instanceof ValidationException) {
			statusCode = HttpStatus.BAD_REQUEST
			message = 'Validation failed'
			errors = formatValidationErrors(exception.errors)
		}

		if (exception instanceof HttpException) {
			statusCode = exception.getStatus()
			const exceptionResponse = exception.getResponse()

			if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
				const responseObj = exceptionResponse as ExceptionResponse
				message = responseObj.message ?? message
				errors = responseObj.errors ?? null
			} else if (typeof exceptionResponse === 'string') {
				message = exceptionResponse
			}
		}

		console.error(exception)

		response.status(statusCode).json({
			statusCode,
			message,
			errors,
			timestamp: new Date().toISOString(),
			path: request.url,
		})
	}
}
