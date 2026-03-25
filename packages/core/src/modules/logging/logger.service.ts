import type {
  ErrorLogData,
  LogEntry,
  LogLevel,
  LogMetadata,
  LoggerConfig,
} from '@magnet-cms/common'
import { Injectable, type LoggerService, Scope } from '@nestjs/common'

import { getEventContext } from '~/modules/events/event-context.interceptor'

const LEVEL_ORDER: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
}

const DEFAULT_REDACT_FIELDS = ['password', 'token', 'apiKey', 'secret', 'authorization']

const RESET = '\x1b[0m'
const COLORS: Record<LogLevel, string> = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  info: '\x1b[32m', // green
  debug: '\x1b[36m', // cyan
  verbose: '\x1b[35m', // magenta
}

function readConfig(): LoggerConfig {
  const level = (process.env.LOG_LEVEL ?? 'info') as LogLevel
  const format = process.env.LOG_FORMAT === 'json' ? 'json' : 'pretty'
  const timestamps = process.env.LOG_TIMESTAMPS !== 'false'
  const stackTraces = process.env.LOG_STACK_TRACES !== 'false'
  return {
    level: LEVEL_ORDER[level] !== undefined ? level : 'info',
    format,
    timestamps,
    stackTraces,
    redactFields: DEFAULT_REDACT_FIELDS,
  }
}

function redactMetadata(
  metadata: LogMetadata | undefined,
  fields: string[],
): LogMetadata | undefined {
  if (!metadata) return undefined
  const result: LogMetadata = {}
  for (const [key, value] of Object.entries(metadata)) {
    result[key] = fields.includes(key) ? '[REDACTED]' : value
  }
  return result
}

function parseError(trace?: unknown): ErrorLogData | undefined {
  if (!trace) return undefined
  if (trace instanceof Error) {
    return { name: trace.name, message: trace.message, stack: trace.stack }
  }
  if (typeof trace === 'string') {
    return { name: 'Error', message: trace, stack: trace }
  }
  return undefined
}

/**
 * Structured logger for Magnet CMS.
 *
 * Implements NestJS LoggerService with JSON/pretty output, log level
 * filtering, sensitive field redaction, and automatic request context
 * enrichment from EventContext (AsyncLocalStorage).
 *
 * @example
 * ```typescript
 * constructor(private readonly logger: MagnetLogger) {
 *   this.logger.setContext(MyService.name)
 * }
 *
 * doWork() {
 *   this.logger.log('Starting work', { operation: 'doWork' })
 * }
 * ```
 */
@Injectable({ scope: Scope.TRANSIENT })
export class MagnetLogger implements LoggerService {
  private context = 'App'
  private cachedConfig: LoggerConfig | null = null

  /** Create a standalone logger instance (for use before DI is available). */
  static create(context = 'App'): MagnetLogger {
    const instance = new MagnetLogger()
    instance.setContext(context)
    return instance
  }

  /** Set the logger context (service name). Call in constructor. */
  setContext(context: string): void {
    this.context = context
  }

  /** Return a child logger with a namespaced context (parent:child). */
  child(context: string): MagnetLogger {
    const instance = new MagnetLogger()
    instance.setContext(`${this.context}:${context}`)
    return instance
  }

  log(message: string, metadata?: LogMetadata): void {
    this.write('info', message, metadata)
  }

  error(message: string, trace?: unknown, metadata?: LogMetadata): void {
    this.write('error', message, metadata, parseError(trace))
  }

  warn(message: string, metadata?: LogMetadata): void {
    this.write('warn', message, metadata)
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.write('debug', message, metadata)
  }

  verbose(message: string, metadata?: LogMetadata): void {
    this.write('verbose', message, metadata)
  }

  private getConfig(): LoggerConfig {
    if (!this.cachedConfig) {
      this.cachedConfig = readConfig()
    }
    return this.cachedConfig
  }

  private write(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata,
    error?: ErrorLogData,
  ): void {
    const config = this.getConfig()

    if (LEVEL_ORDER[level] > LEVEL_ORDER[config.level]) {
      return
    }

    const eventCtx = getEventContext()

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.context,
      requestId: eventCtx?.requestId,
      userId: eventCtx?.userId,
      metadata: redactMetadata(metadata, config.redactFields),
      error,
    }

    const output =
      config.format === 'json' ? this.formatJson(entry, config) : this.formatPretty(entry, config)

    if (level === 'error') {
      process.stderr.write(output)
    } else {
      process.stdout.write(output)
    }
  }

  private formatJson(entry: LogEntry, config: LoggerConfig): string {
    const obj: Record<string, unknown> = {
      level: entry.level,
      message: entry.message,
      context: entry.context,
    }
    if (config.timestamps) obj.timestamp = entry.timestamp
    if (entry.requestId) obj.requestId = entry.requestId
    if (entry.userId) obj.userId = entry.userId
    if (entry.metadata) obj.metadata = entry.metadata
    if (entry.error) obj.error = entry.error
    return `${JSON.stringify(obj)}\n`
  }

  private formatPretty(entry: LogEntry, config: LoggerConfig): string {
    const color = COLORS[entry.level] ?? RESET
    const levelStr = entry.level.toUpperCase().padEnd(7)
    const parts: string[] = []

    if (config.timestamps) {
      parts.push(`\x1b[90m${entry.timestamp}${RESET}`)
    }

    parts.push(`${color}${levelStr}${RESET}`)
    parts.push(`\x1b[33m[${entry.context}]${RESET}`)
    parts.push(entry.message)

    if (entry.requestId) {
      parts.push(`\x1b[90m(${entry.requestId})${RESET}`)
    }

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      parts.push(JSON.stringify(entry.metadata))
    }

    if (entry.error?.stack) {
      return `${parts.join(' ')}\n${entry.error.stack}\n`
    }

    return `${parts.join(' ')}\n`
  }
}
