/** Log severity levels, ordered from most critical to most verbose. */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose'

/** Structured metadata attached to a log entry. */
export interface LogMetadata {
	operation?: string
	schema?: string
	resourceId?: string
	duration?: number
	method?: string
	path?: string
	statusCode?: number
	[key: string]: unknown
}

/** Serialized error information for structured logging. */
export interface ErrorLogData {
	name: string
	message: string
	code?: string
	stack?: string
}

/** A single structured log entry. */
export interface LogEntry {
	level: LogLevel
	message: string
	timestamp: string
	context: string
	requestId?: string
	userId?: string
	metadata?: LogMetadata
	error?: ErrorLogData
}

/** Configuration for MagnetLogger, read from environment variables. */
export interface LoggerConfig {
	/** Minimum log level to output. Default: 'info' */
	level: LogLevel
	/** Output format. Default: 'pretty' */
	format: 'json' | 'pretty'
	/** Whether to include timestamps. Default: true */
	timestamps: boolean
	/** Whether to include error stack traces. Default: true */
	stackTraces: boolean
	/** Field names to redact from metadata. */
	redactFields: string[]
}
