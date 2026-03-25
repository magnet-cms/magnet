import {
  EXTEND_USER_METADATA_KEY,
  FIELD_METADATA_KEY,
  type FieldMetadata,
  PROP_METADATA_KEY,
  type PropOptions,
  type UIDecoratorOptions,
  UI_METADATA_KEY,
  getExtendUserOptions,
  isUserExtension,
} from '@magnet-cms/common'
import type { Type } from '@nestjs/common'
import { Inject, Injectable, Optional } from '@nestjs/common'

import { User } from './schemas/user.schema'

import { MagnetLogger } from '~/modules/logging/logger.service'

/**
 * Prop metadata format stored by @Prop decorator
 */
interface PropMetadataEntry {
  propertyKey: string | symbol
  options: PropOptions
}

/**
 * UI metadata format stored by @UI decorator
 */
interface UIMetadataEntry {
  propertyKey: string | symbol
  options: UIDecoratorOptions & { designType: Function }
}

/**
 * Token for injecting the user extension class
 */
export const USER_EXTENSION_TOKEN = 'MAGNET_USER_EXTENSION'

/**
 * Service for managing User schema extensions.
 *
 * Handles merging the base User schema with custom user extensions
 * decorated with @ExtendUser().
 *
 * @example
 * ```typescript
 * // Get the merged user schema (base + extension)
 * const UserSchema = userExtensionService.getMergedSchema()
 *
 * // Check if user has been extended
 * if (userExtensionService.hasExtension()) {
 *   // Use extended fields
 * }
 * ```
 */
@Injectable()
export class UserExtensionService {
  private mergedSchema: Type | null = null

  constructor(
    private readonly logger: MagnetLogger,
    @Optional()
    @Inject(USER_EXTENSION_TOKEN)
    private readonly extensionClass: Type | null = null,
  ) {
    this.logger.setContext(UserExtensionService.name)
    if (this.extensionClass) {
      this.initializeExtension()
    }
  }

  /**
   * Initialize the user extension by merging schemas
   */
  private initializeExtension(): void {
    if (!this.extensionClass) {
      return
    }

    if (!isUserExtension(this.extensionClass)) {
      this.logger.warn(`${this.extensionClass.name} is not decorated with @ExtendUser(). Ignoring.`)
      return
    }

    this.logger.log(`Merging User schema with extension: ${this.extensionClass.name}`)
    this.mergedSchema = this.mergeUserSchemas(User, this.extensionClass)
  }

  /**
   * Check if a user extension has been registered
   */
  hasExtension(): boolean {
    return this.extensionClass !== null && this.mergedSchema !== null
  }

  /**
   * Get the merged user schema (base + extension)
   *
   * Returns the base User schema if no extension is registered.
   */
  getMergedSchema(): Type {
    return this.mergedSchema ?? User
  }

  /**
   * Get the extension class if registered
   */
  getExtensionClass(): Type | null {
    return this.extensionClass
  }

  /**
   * Get extension options
   */
  getExtensionOptions(): ReturnType<typeof getExtendUserOptions> {
    if (!this.extensionClass) {
      return undefined
    }
    return getExtendUserOptions(this.extensionClass)
  }

  /**
   * Get all field metadata from the merged schema
   */
  getMergedFieldMetadata(): FieldMetadata[] {
    const schema = this.getMergedSchema()
    return Reflect.getMetadata(FIELD_METADATA_KEY, schema.prototype) ?? []
  }

  /**
   * Merge base user schema with extension fields.
   *
   * This creates a new class that combines the base User fields
   * with any additional fields from the extension.
   */
  private mergeUserSchemas(base: Type, extension: Type): Type {
    // Extract metadata from both classes
    const baseFieldMetadata: FieldMetadata[] =
      Reflect.getMetadata(FIELD_METADATA_KEY, base.prototype) ?? []
    const extensionFieldMetadata: FieldMetadata[] =
      Reflect.getMetadata(FIELD_METADATA_KEY, extension.prototype) ?? []

    const basePropMetadata: PropMetadataEntry[] =
      Reflect.getMetadata(PROP_METADATA_KEY, base.prototype) ?? []
    const extensionPropMetadata: PropMetadataEntry[] =
      Reflect.getMetadata(PROP_METADATA_KEY, extension.prototype) ?? []

    const baseUIMetadata: UIMetadataEntry[] =
      Reflect.getMetadata(UI_METADATA_KEY, base.prototype) ?? []
    const extensionUIMetadata: UIMetadataEntry[] =
      Reflect.getMetadata(UI_METADATA_KEY, extension.prototype) ?? []

    // Create merged class that extends base
    class MergedUser extends base {
      constructor() {
        super()
        // Copy default values from extension
        const extensionInstance = new extension()
        const extensionKeys = Object.keys(extensionInstance)
        for (const key of extensionKeys) {
          const value = (extensionInstance as Record<string, unknown>)[key]
          if (value !== undefined) {
            ;(this as Record<string, unknown>)[key] = value
          }
        }
      }
    }

    // Copy property descriptors (including getters/setters)
    const descriptors = Object.getOwnPropertyDescriptors(extension.prototype)
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (key !== 'constructor') {
        Object.defineProperty(MergedUser.prototype, key, descriptor)
      }
    }

    // Merge field metadata (extension fields override base fields with same key)
    const mergedFieldMetadata = this.mergeMetadataArrays(baseFieldMetadata, extensionFieldMetadata)

    // Merge prop metadata
    const mergedPropMetadata = this.mergeMetadataArrays(basePropMetadata, extensionPropMetadata)

    // Merge UI metadata
    const mergedUIMetadata = this.mergeMetadataArrays(baseUIMetadata, extensionUIMetadata)

    // Apply merged metadata to the new class
    Reflect.defineMetadata(FIELD_METADATA_KEY, mergedFieldMetadata, MergedUser.prototype)
    Reflect.defineMetadata(PROP_METADATA_KEY, mergedPropMetadata, MergedUser.prototype)
    Reflect.defineMetadata(UI_METADATA_KEY, mergedUIMetadata, MergedUser.prototype)

    // Copy extension metadata
    Reflect.defineMetadata(EXTEND_USER_METADATA_KEY, getExtendUserOptions(extension), MergedUser)

    // Set class name for debugging
    Object.defineProperty(MergedUser, 'name', { value: 'User' })

    return MergedUser
  }

  /**
   * Merge two metadata arrays, with items from the second array
   * overriding items from the first array that have the same key.
   */
  private mergeMetadataArrays<T extends { propertyKey: string | symbol }>(
    base: T[],
    extension: T[],
  ): T[] {
    const merged = new Map<string | symbol, T>()

    // Add base items
    for (const item of base) {
      merged.set(item.propertyKey, item)
    }

    // Override/add extension items
    for (const item of extension) {
      merged.set(item.propertyKey, item)
    }

    return Array.from(merged.values())
  }
}
