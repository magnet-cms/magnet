import type { SchemaMetadata, SchemaProperty } from '@magnet-cms/common'

import type { ParsedSettingsSchema, SettingsSection, SettingsTab } from '../types'

const DEFAULT_SECTION = '__default__'

/**
 * Parse schema metadata into tabs for navigation
 *
 * @param schemas - Array of schema metadata from discovery API
 * @returns Sorted array of tabs for rendering
 */
export function parseSettingsTabs(schemas: SchemaMetadata[]): SettingsTab[] {
  return schemas
    .filter((schema) => schema.settingsOptions !== undefined)
    .map((schema) => ({
      id: schema.settingsOptions?.group ?? schema.apiName ?? schema.name,
      label: schema.settingsOptions?.label ?? schema.displayName ?? schema.name,
      icon: schema.settingsOptions?.icon,
      description: schema.settingsOptions?.description,
      order: schema.settingsOptions?.order ?? 99,
    }))
    .sort((a, b) => a.order - b.order)
}

/**
 * Parse schema metadata into sections with fields for form generation
 *
 * @param schema - Schema metadata from discovery API
 * @returns Parsed schema with sections and fields
 */
export function parseSettingsSchema(schema: SchemaMetadata): ParsedSettingsSchema {
  const sectionDefs = schema.settingsOptions?.sections ?? []
  const sectionMap = new Map<string, SchemaProperty[]>()

  // Group properties by their section
  for (const prop of schema.properties) {
    // Get section from ui.section property
    const sectionName = getSectionFromProperty(prop) ?? DEFAULT_SECTION
    const existing = sectionMap.get(sectionName) ?? []
    sectionMap.set(sectionName, [...existing, prop])
  }

  // Build sections array
  const sections: SettingsSection[] = []

  // Process defined sections first (maintain their order)
  for (const def of sectionDefs) {
    const fields = sectionMap.get(def.name) ?? []
    if (fields.length > 0) {
      sections.push({
        name: def.name,
        label: def.label,
        icon: def.icon,
        description: def.description,
        order: def.order ?? 99,
        variant: def.variant ?? 'default',
        fields: sortFieldsByOrder(fields),
      })
      sectionMap.delete(def.name)
    }
  }

  // Add default section for ungrouped fields
  const defaultFields = sectionMap.get(DEFAULT_SECTION)
  if (defaultFields && defaultFields.length > 0) {
    sections.push({
      name: DEFAULT_SECTION,
      label: 'General',
      order: 0,
      variant: 'default',
      fields: sortFieldsByOrder(defaultFields),
    })
  }

  // Add any remaining sections that weren't defined but have fields
  for (const [name, fields] of sectionMap.entries()) {
    if (name !== DEFAULT_SECTION && fields.length > 0) {
      sections.push({
        name,
        label: formatSectionName(name),
        order: 50,
        variant: 'default',
        fields: sortFieldsByOrder(fields),
      })
    }
  }

  return {
    group: schema.settingsOptions?.group ?? schema.apiName ?? schema.name,
    label: schema.settingsOptions?.label ?? schema.displayName ?? schema.name,
    icon: schema.settingsOptions?.icon,
    description: schema.settingsOptions?.description,
    sections: sections.sort((a, b) => a.order - b.order),
  }
}

/**
 * Extract section name from a property's UI metadata
 */
function getSectionFromProperty(prop: SchemaProperty): string | undefined {
  if (prop.ui && typeof prop.ui === 'object' && 'section' in prop.ui) {
    return prop.ui.section as string
  }
  return undefined
}

/**
 * Sort fields by their order property (from ui.order)
 */
function sortFieldsByOrder(fields: SchemaProperty[]): SchemaProperty[] {
  return [...fields].sort((a, b) => {
    const orderA = getOrderFromProperty(a)
    const orderB = getOrderFromProperty(b)
    return orderA - orderB
  })
}

/**
 * Extract order from a property's UI metadata
 */
function getOrderFromProperty(prop: SchemaProperty): number {
  if (prop.ui && typeof prop.ui === 'object' && 'order' in prop.ui) {
    const order = prop.ui.order
    if (typeof order === 'number') {
      return order
    }
  }
  return 99
}

/**
 * Format a section name from kebab-case or camelCase to Title Case
 */
function formatSectionName(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
