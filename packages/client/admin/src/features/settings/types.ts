import type { SchemaProperty, SettingSectionVariant } from '@magnet-cms/common'

/**
 * Settings tab derived from schema metadata for navigation
 */
export interface SettingsTab {
  /** Unique identifier (group name) */
  id: string
  /** Display label */
  label: string
  /** Icon name from lucide */
  icon?: string
  /** Description */
  description?: string
  /** Sort order */
  order: number
}

/**
 * Settings section for grouping form fields
 */
export interface SettingsSection {
  /** Unique section identifier */
  name: string
  /** Display label */
  label: string
  /** Icon name from lucide */
  icon?: string
  /** Section description */
  description?: string
  /** Display order */
  order: number
  /** Visual variant (default or danger) */
  variant: SettingSectionVariant
  /** Fields belonging to this section */
  fields: SchemaProperty[]
}

/**
 * Parsed settings schema ready for form generation
 */
export interface ParsedSettingsSchema {
  /** Group identifier */
  group: string
  /** Display label */
  label: string
  /** Icon name from lucide */
  icon?: string
  /** Description */
  description?: string
  /** Ordered sections with their fields */
  sections: SettingsSection[]
}

/**
 * Field type mapping for UI rendering
 */
export type SettingFieldUIType =
  | 'text'
  | 'number'
  | 'switch'
  | 'select'
  | 'multiSelect'
  | 'password'
  | 'textarea'
  | 'json'
  | 'upload'
