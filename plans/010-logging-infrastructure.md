# Plan 010: Logging Infrastructure

**Status:** Proposed
**Priority:** Medium
**Estimated Effort:** 1 week
**Depends on:** Plan 000 (Type Safety Remediation)

---

## Summary

Replace scattered `console.log`, `console.warn`, and `console.error` calls with a structured logging system using NestJS's built-in Logger. This improves observability, debugging, and production monitoring.

---

## Problem Statement

### Current Issues

1. **Inconsistent logging** - Mix of `console.*` and NestJS Logger
2. **No structured data** - Plain string messages without context
3. **No log levels** - Can't filter by severity in production
4. **No request correlation** - Can't trace logs across a request lifecycle
5. **Hard to monitor** - No standard format for log aggregation tools

### Current Violations

```typescript
// Found in codebase
console.log('Schema registered:', schema.name)           // content.service.ts
console.warn('Plugin not found:', name)                  // plugin.service.ts
console.error(exception)                                  // global-exception.filter.ts
console.log('Starting migration...')                     // Various files
```

---

## Proposed Solution

### 1. Logging Types

```typescript
// packages/common/src/types/logging.types.ts

/**
 * Log levels
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

/**
 * Structured log entry
 */
export interface LogEntry {
  /** Log level */
  level: LogLevel
  /** Log message */
  message: string
  /** Timestamp */
  timestamp: Date
  /** Logger context (class name) */
  context: string
  /** Request ID for correlation */
  requestId?: string
  /** User ID if authenticated */
  userId?: string
  /** Additional structured data */
  metadata?: LogMetadata
  /** Error details if applicable */
  error?: ErrorLogData
}

/**
 * Metadata for structured logging
 */
export interface LogMetadata {
  /** Operation being performed */
  operation?: string
  /** Schema/resource being acted on */
  schema?: string
  /** Document/resource ID */
  resourceId?: string
  /** Duration in milliseconds */
  duration?: number
  /** HTTP method */
  method?: string
  /** HTTP path */
  path?: string
  /** HTTP status code */
  statusCode?: number
  /** Additional context-specific data */
  [key: string]: unknown
}

/**
 * Error data for logging
 */
export interface ErrorLogData {
  name: string
  message: string
  code?: string | number
  stack?: string
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel
  /** Output format */
  format: 'json' | 'pretty'
  /** Include timestamps */
  timestamps: boolean
  /** Include stack traces for errors */
  stackTraces: boolean
  /** Redact sensitive fields */
  redactFields: string[]
}
```

### 2. Enhanced Logger Service

```typescript
// packages/core/src/modules/logging/logger.service.ts

import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { LogLevel, LogEntry, LogMetadata, ErrorLogData, LoggerConfig } from '@magnet/common'
import { getRequestContext } from './request-context'

@Injectable({ scope: Scope.TRANSIENT })
export class MagnetLogger implements NestLoggerService {
  private context = 'Application'
  private config: LoggerConfig

  constructor(private configService: ConfigService) {
    this.config = this.loadConfig()
  }

  /**
   * Set the logger context (class name)
   */
  setContext(context: string): void {
    this.context = context
  }

  /**
   * Log error message
   */
  error(message: string, errorOrMetadata?: Error | LogMetadata, metadata?: LogMetadata): void {
    const entry = this.createEntry(LogLevel.ERROR, message, errorOrMetadata, metadata)
    this.output(entry)
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: LogMetadata): void {
    const entry = this.createEntry(LogLevel.WARN, message, undefined, metadata)
    this.output(entry)
  }

  /**
   * Log info message
   */
  log(message: string, metadata?: LogMetadata): void {
    const entry = this.createEntry(LogLevel.INFO, message, undefined, metadata)
    this.output(entry)
  }

  /**
   * Log debug message
   */
  debug(message: string, metadata?: LogMetadata): void {
    const entry = this.createEntry(LogLevel.DEBUG, message, undefined, metadata)
    this.output(entry)
  }

  /**
   * Log verbose message
   */
  verbose(message: string, metadata?: LogMetadata): void {
    const entry = this.createEntry(LogLevel.VERBOSE, message, undefined, metadata)
    this.output(entry)
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): MagnetLogger {
    const child = new MagnetLogger(this.configService)
    child.setContext(`${this.context}:${context}`)
    return child
  }

  private createEntry(
    level: LogLevel,
    message: string,
    errorOrMetadata?: Error | LogMetadata,
    additionalMetadata?: LogMetadata
  ): LogEntry {
    const requestContext = getRequestContext()

    let error: ErrorLogData | undefined
    let metadata: LogMetadata | undefined

    if (errorOrMetadata instanceof Error) {
      error = {
        name: errorOrMetadata.name,
        message: errorOrMetadata.message,
        stack: this.config.stackTraces ? errorOrMetadata.stack : undefined,
      }
      metadata = additionalMetadata
    } else {
      metadata = { ...errorOrMetadata, ...additionalMetadata }
    }

    return {
      level,
      message,
      timestamp: new Date(),
      context: this.context,
      requestId: requestContext?.requestId,
      userId: requestContext?.userId,
      metadata: this.redactSensitiveData(metadata),
      error,
    }
  }

  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) {
      return
    }

    const formatted = this.config.format === 'json'
      ? this.formatJson(entry)
      : this.formatPretty(entry)

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(formatted)
        break
      case LogLevel.WARN:
        console.warn(formatted)
        break
      default:
        console.log(formatted)
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.VERBOSE]
    const configIndex = levels.indexOf(this.config.level)
    const messageIndex = levels.indexOf(level)
    return messageIndex <= configIndex
  }

  private formatJson(entry: LogEntry): string {
    return JSON.stringify({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    })
  }

  private formatPretty(entry: LogEntry): string {
    const timestamp = this.config.timestamps
      ? `[${entry.timestamp.toISOString()}] `
      : ''
    const level = entry.level.toUpperCase().padEnd(7)
    const context = `[${entry.context}]`
    const requestId = entry.requestId ? ` (${entry.requestId.slice(0, 8)})` : ''

    let output = `${timestamp}${level} ${context}${requestId} ${entry.message}`

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += ` ${JSON.stringify(entry.metadata)}`
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`
      if (entry.error.stack) {
        output += `\n${entry.error.stack}`
      }
    }

    return output
  }

  private redactSensitiveData(metadata?: LogMetadata): LogMetadata | undefined {
    if (!metadata) return undefined

    const redacted = { ...metadata }
    for (const field of this.config.redactFields) {
      if (field in redacted) {
        redacted[field] = '[REDACTED]'
      }
    }
    return redacted
  }

  private loadConfig(): LoggerConfig {
    return {
      level: (this.configService.get('LOG_LEVEL') as LogLevel) ?? LogLevel.INFO,
      format: (this.configService.get('LOG_FORMAT') as 'json' | 'pretty') ?? 'pretty',
      timestamps: this.configService.get('LOG_TIMESTAMPS') !== 'false',
      stackTraces: this.configService.get('LOG_STACK_TRACES') !== 'false',
      redactFields: ['password', 'token', 'apiKey', 'secret', 'authorization'],
    }
  }
}
```

### 3. Request Context for Logging

```typescript
// packages/core/src/modules/logging/request-context.ts

import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContext {
  requestId: string
  userId?: string
  path?: string
  method?: string
  startTime: number
}

const requestContextStorage = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore()
}

export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T
): T {
  return requestContextStorage.run(context, fn)
}
```

### 4. Logging Interceptor

```typescript
// packages/core/src/modules/logging/logging.interceptor.ts

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'
import { v4 as uuidv4 } from 'uuid'
import { MagnetLogger } from './logger.service'
import { runWithRequestContext, RequestContext } from './request-context'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: MagnetLogger) {
    this.logger.setContext('HTTP')
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const { method, url, ip } = request

    const requestContext: RequestContext = {
      requestId: request.headers['x-request-id'] ?? uuidv4(),
      userId: request.user?.id,
      path: url,
      method,
      startTime: Date.now(),
    }

    // Add request ID to response headers
    const response = context.switchToHttp().getResponse()
    response.setHeader('x-request-id', requestContext.requestId)

    return new Observable((subscriber) => {
      runWithRequestContext(requestContext, () => {
        this.logger.log('Request started', {
          method,
          path: url,
          ip,
        })

        next.handle().pipe(
          tap({
            next: () => {
              const duration = Date.now() - requestContext.startTime
              this.logger.log('Request completed', {
                method,
                path: url,
                statusCode: response.statusCode,
                duration,
              })
            },
            error: (error) => {
              const duration = Date.now() - requestContext.startTime
              this.logger.error('Request failed', error, {
                method,
                path: url,
                duration,
              })
            },
          })
        ).subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        })
      })
    })
  }
}
```

### 5. Logging Module

```typescript
// packages/core/src/modules/logging/logging.module.ts

import { Global, Module } from '@nestjs/common'
import { MagnetLogger } from './logger.service'
import { LoggingInterceptor } from './logging.interceptor'

@Global()
@Module({
  providers: [MagnetLogger, LoggingInterceptor],
  exports: [MagnetLogger, LoggingInterceptor],
})
export class LoggingModule {}
```

### 6. Migration Examples

```typescript
// BEFORE: content.service.ts
console.log('Schema registered:', schema.name)
console.log('Creating content for schema:', schemaName)
console.error('Failed to create content:', error)

// AFTER: content.service.ts
@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name)

  async create(schema: string, data: CreateContentDto): Promise<Content> {
    this.logger.log('Creating content', { schema, locale: data.locale })

    try {
      const result = await this.model.create(data)
      this.logger.debug('Content created', { schema, id: result.id })
      return result
    } catch (error) {
      this.logger.error('Failed to create content', error, { schema })
      throw error
    }
  }
}

// BEFORE: plugin.service.ts
console.warn('Plugin not found:', name)

// AFTER: plugin.service.ts
this.logger.warn('Plugin not found', { pluginName: name })

// BEFORE: mongoose.model.ts
console.log('Executing query:', JSON.stringify(filter))

// AFTER: mongoose.model.ts
this.logger.debug('Executing query', { filter, schema: this._schemaName })
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Days 1-2)
- [ ] Create `packages/common/src/types/logging.types.ts`
- [ ] Create `MagnetLogger` service
- [ ] Create request context storage
- [ ] Create `LoggingInterceptor`
- [ ] Create `LoggingModule`

### Phase 2: Integration (Days 3-4)
- [ ] Register `LoggingModule` in `MagnetModule`
- [ ] Register `LoggingInterceptor` globally
- [ ] Update NestJS bootstrap to use `MagnetLogger`

### Phase 3: Migration (Days 5-6)
- [ ] Replace `console.*` in adapters (mongoose, drizzle)
- [ ] Replace `console.*` in core services
- [ ] Replace `console.*` in controllers
- [ ] Update global exception filter to use logger

### Phase 4: Documentation (Day 7)
- [ ] Document logging configuration options
- [ ] Document logging best practices
- [ ] Add examples to documentation

---

## Configuration

Environment variables:

```env
# Log level: error, warn, info, debug, verbose
LOG_LEVEL=info

# Output format: json (for production), pretty (for development)
LOG_FORMAT=pretty

# Include timestamps in output
LOG_TIMESTAMPS=true

# Include stack traces in error logs
LOG_STACK_TRACES=true
```

---

## File Changes Summary

### New Files
| Path | Description |
|------|-------------|
| `packages/common/src/types/logging.types.ts` | Logging type definitions |
| `packages/core/src/modules/logging/logger.service.ts` | MagnetLogger service |
| `packages/core/src/modules/logging/request-context.ts` | Request context storage |
| `packages/core/src/modules/logging/logging.interceptor.ts` | HTTP logging interceptor |
| `packages/core/src/modules/logging/logging.module.ts` | Logging module |
| `packages/core/src/modules/logging/index.ts` | Barrel export |

### Modified Files
| Path | Changes |
|------|---------|
| `packages/common/src/index.ts` | Export logging types |
| `packages/core/src/magnet.module.ts` | Import LoggingModule |
| `packages/core/src/main.ts` (bootstrap) | Use MagnetLogger |
| `packages/adapters/mongoose/src/*.ts` | Replace console.* |
| `packages/adapters/drizzle/src/*.ts` | Replace console.* |
| `packages/core/src/modules/**/*.ts` | Replace console.* |
| `packages/core/src/handlers/global-exception.filter.ts` | Use MagnetLogger |

---

## Success Criteria

1. Zero `console.*` calls in codebase (except in MagnetLogger)
2. All logs include context (class name)
3. Request ID correlation works across logs
4. Log level filtering works correctly
5. JSON format works for production
6. Sensitive fields are redacted
7. Error logs include stack traces (configurable)
8. `bun run check-types` passes with 0 errors

---

## Dependencies

- **Depends on:** Plan 000 (Type Safety)
- **Blocks:** None (optional enhancement)
