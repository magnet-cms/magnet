import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

import { MagnetLogger } from './logger.service'

interface HttpRequest {
  method: string
  url: string
  ip?: string
}

interface HttpResponse {
  statusCode: number
}

/**
 * HTTP Logging Interceptor
 *
 * Logs HTTP request lifecycle (start, completion, duration) using MagnetLogger.
 * Reads request context from EventContext (populated by EventContextInterceptor)
 * for request ID correlation.
 *
 * Registered globally via APP_INTERCEPTOR in MagnetModule.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: MagnetLogger) {
    this.logger.setContext('HTTP')
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle()
    }

    const http = context.switchToHttp()
    const request = http.getRequest<HttpRequest>()
    const response = http.getResponse<HttpResponse>()
    const { method, url, ip } = request
    const start = Date.now()

    this.logger.debug(`${method} ${url} started`, { method, path: url, ip })

    return next.handle().pipe(
      tap({
        complete: () => {
          const duration = Date.now() - start
          const statusCode = response.statusCode
          this.logger.log(`${method} ${url} ${statusCode}`, {
            method,
            path: url,
            statusCode,
            duration,
          })
        },
        error: (err: unknown) => {
          const duration = Date.now() - start
          const message = err instanceof Error ? err.message : 'Unknown error'
          this.logger.warn(`${method} ${url} error: ${message}`, {
            method,
            path: url,
            duration,
          })
        },
      }),
    )
  }
}
