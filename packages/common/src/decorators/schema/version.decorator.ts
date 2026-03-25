import { VersionConfig } from '~/types/version.types'

export const VERSION_METADATA_KEY = 'version:metadata'

/**
 * Decorator to enable versioning for a schema
 * @param config Version configuration
 */
export function Version(config: VersionConfig = {}): ClassDecorator {
  return (target: Function): void => {
    Reflect.defineMetadata(VERSION_METADATA_KEY, config, target)
  }
}
