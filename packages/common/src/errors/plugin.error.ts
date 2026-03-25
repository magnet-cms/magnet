import { ErrorCode, ErrorMetadata, MagnetError } from './base.error'

/**
 * Generic plugin error
 */
export class PluginError extends MagnetError {
  readonly code = ErrorCode.PLUGIN_ERROR
  readonly httpStatus = 500

  constructor(pluginName: string, message: string, metadata?: ErrorMetadata) {
    super(`Plugin '${pluginName}': ${message}`, metadata)
  }
}

/**
 * Plugin not found error
 */
export class PluginNotFoundError extends MagnetError {
  readonly code = ErrorCode.PLUGIN_NOT_FOUND
  readonly httpStatus = 404

  constructor(pluginName: string, metadata?: ErrorMetadata) {
    super(`Plugin '${pluginName}' not found`, metadata)
  }
}

/**
 * Plugin initialization error
 * Thrown when a plugin fails to initialize
 */
export class PluginInitializationError extends MagnetError {
  readonly code = ErrorCode.PLUGIN_INITIALIZATION_FAILED
  readonly httpStatus = 500

  constructor(pluginName: string, reason: string, metadata?: ErrorMetadata) {
    super(`Failed to initialize plugin '${pluginName}': ${reason}`, metadata)
  }
}

/**
 * Hook execution error
 * Thrown when a plugin hook fails to execute
 */
export class HookExecutionError extends MagnetError {
  readonly code = ErrorCode.HOOK_EXECUTION_FAILED
  readonly httpStatus = 500

  constructor(hookName: string, pluginName: string, reason: string, metadata?: ErrorMetadata) {
    super(`Hook '${hookName}' in plugin '${pluginName}' failed: ${reason}`, metadata)
  }
}
