'use client'

import type { SchemaProperty } from '@magnet-cms/common'
import { RHFMultiSelect, RHFSelect, RHFSwitch, RHFText, RHFTextarea } from '@magnet-cms/ui'
import type { ReactElement } from 'react'

interface SettingsFieldRendererProps {
  /** The schema property to render */
  field: SchemaProperty
  /** Whether the field is disabled */
  disabled?: boolean
}

interface SelectOption {
  key: string
  value: string
}

/**
 * Renders a form field based on schema property metadata.
 * Maps the UI type from the schema to the appropriate RHF component.
 */
export function SettingsFieldRenderer({
  field,
  disabled,
}: SettingsFieldRendererProps): ReactElement {
  const uiType = getUIType(field)
  const label = getLabel(field)
  const description = getDescription(field)
  const isReadonly = isFieldReadonly(field)

  switch (uiType) {
    case 'switch':
      return (
        <RHFSwitch
          name={field.name}
          label={label}
          description={description}
          disabled={disabled || isReadonly}
          formItemClassName="flex flex-row items-center justify-between gap-4 rounded-none border-0 p-0 shadow-none"
        />
      )

    case 'select':
      return (
        <RHFSelect
          name={field.name}
          label={label}
          description={description}
          options={mapSelectOptions(field)}
          disabled={disabled || isReadonly}
        />
      )

    case 'multiSelect':
      return (
        <RHFMultiSelect
          name={field.name}
          label={label}
          description={description}
          options={mapMultiSelectOptions(field)}
          disabled={disabled || isReadonly}
        />
      )

    case 'number':
      return (
        <RHFText
          name={field.name}
          label={label}
          description={description}
          type="number"
          disabled={disabled || isReadonly}
          min={getNumberMin(field)}
          max={getNumberMax(field)}
          step={getNumberStep(field)}
        />
      )

    case 'password':
      return (
        <RHFText
          name={field.name}
          label={label}
          description={description}
          type="password"
          disabled={disabled || isReadonly}
          placeholder="••••••••"
        />
      )

    case 'textarea':
      return (
        <RHFTextarea
          name={field.name}
          label={label}
          description={description}
          disabled={disabled || isReadonly}
          rows={4}
        />
      )

    default:
      return (
        <RHFText
          name={field.name}
          label={label}
          description={description}
          type="text"
          disabled={disabled || isReadonly}
          placeholder={getPlaceholder(field)}
        />
      )
  }
}

/**
 * Extract the UI type from the field's UI metadata
 */
function getUIType(field: SchemaProperty): string {
  if (field.ui && typeof field.ui === 'object' && 'type' in field.ui) {
    return field.ui.type as string
  }
  // Default based on schema type
  if (field.type === 'Boolean') return 'switch'
  if (field.type === 'Number') return 'number'
  return 'text'
}

/**
 * Extract the label from the field's UI metadata
 */
function getLabel(field: SchemaProperty): string {
  if (field.ui && typeof field.ui === 'object' && 'label' in field.ui) {
    return String(field.ui.label)
  }
  // Format field name as label (camelCase to Title Case)
  return field.name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (str) => str.toUpperCase())
}

/**
 * Extract the description from the field's UI metadata
 */
function getDescription(field: SchemaProperty): string | undefined {
  if (field.ui && typeof field.ui === 'object' && 'description' in field.ui) {
    return String(field.ui.description)
  }
  return undefined
}

/**
 * Check if field is readonly
 */
function isFieldReadonly(field: SchemaProperty): boolean {
  if (field.ui && typeof field.ui === 'object' && 'readonly' in field.ui) {
    return Boolean(field.ui.readonly)
  }
  return false
}

/**
 * Get placeholder from UI options
 */
function getPlaceholder(field: SchemaProperty): string | undefined {
  if (field.ui && typeof field.ui === 'object' && 'placeholder' in field.ui) {
    return String(field.ui.placeholder)
  }
  return undefined
}

/**
 * Get min value for number fields
 */
function getNumberMin(field: SchemaProperty): number | undefined {
  if (field.ui && typeof field.ui === 'object' && 'min' in field.ui) {
    const min = field.ui.min
    return typeof min === 'number' ? min : undefined
  }
  return undefined
}

/**
 * Get max value for number fields
 */
function getNumberMax(field: SchemaProperty): number | undefined {
  if (field.ui && typeof field.ui === 'object' && 'max' in field.ui) {
    const max = field.ui.max
    return typeof max === 'number' ? max : undefined
  }
  return undefined
}

/**
 * Get step value for number fields
 */
function getNumberStep(field: SchemaProperty): number | undefined {
  if (field.ui && typeof field.ui === 'object' && 'step' in field.ui) {
    const step = field.ui.step
    return typeof step === 'number' ? step : undefined
  }
  return undefined
}

/**
 * Map select options from the field's UI metadata to RHFSelect format
 */
function mapSelectOptions(field: SchemaProperty): Array<{ value: string; label: string }> {
  if (field.ui && typeof field.ui === 'object' && 'options' in field.ui) {
    const options = field.ui.options
    if (Array.isArray(options)) {
      return options.map((opt: SelectOption | string) => {
        if (typeof opt === 'object' && opt !== null && 'key' in opt) {
          // Format: { key: 'value', value: 'label' }
          return { value: opt.key, label: opt.value }
        }
        if (typeof opt === 'object' && opt !== null && 'value' in opt) {
          // Format: { value: 'value', label: 'label' }
          const typedOpt = opt as { value: string; label?: string }
          return {
            value: typedOpt.value,
            label: typedOpt.label ?? typedOpt.value,
          }
        }
        // String option
        return { value: String(opt), label: String(opt) }
      })
    }
  }
  return []
}

/**
 * Map multi-select options from the field's UI metadata to RHFMultiSelect format
 */
function mapMultiSelectOptions(field: SchemaProperty): Array<{ value: string; label: string }> {
  // Same format as single select
  return mapSelectOptions(field)
}
