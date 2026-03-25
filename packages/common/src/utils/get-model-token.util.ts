import { Type } from '@nestjs/common'

/**
 * Get model injection token for any adapter
 * @param schema Schema class or schema name
 * @returns Injection token string
 */
export function getModelToken(schema: Type | string): string {
  const name = typeof schema === 'string' ? schema : schema.name
  return `MAGNET_MODEL_${name.toUpperCase()}`
}

/**
 * Get adapter injection token
 * @returns Injection token for the database adapter
 */
export function getAdapterToken(): string {
  return 'MAGNET_DATABASE_ADAPTER'
}

/**
 * Global model registry.
 * Models register themselves during DI initialization so they can be
 * retrieved by the content service without relying on NestJS module scoping.
 */
const globalModelRegistry = new Map<string, unknown>()

export function registerModel(token: string, model: unknown): void {
  globalModelRegistry.set(token, model)
}

export function getRegisteredModel<T>(token: string): T | undefined {
  return globalModelRegistry.get(token) as T | undefined
}
