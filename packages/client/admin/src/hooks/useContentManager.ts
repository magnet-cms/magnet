import { SchemaMetadata } from '@magnet-cms/common'
import { TextNames, names } from '@magnet-cms/utils'
import { useOutletContext, useParams } from 'react-router-dom'

import { useSchema } from '~/hooks/useDiscovery'

export type ContentManagerItemContext = {
  name: TextNames
  schemaMetadata: SchemaMetadata
}

export const useContentManager = () => {
  const { schema } = useParams()
  const outletContext = useOutletContext<ContentManagerItemContext>()

  // Normalize schema parameter: convert snake_case or other separators to kebab-case
  // This handles URLs like /content-manager/medical_record or /content-manager/medical-record
  const normalizedSchema =
    schema
      ?.replace(/_/g, '-')
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase() || schema

  // Hooks must be called before any early returns (Rules of Hooks)
  const { data: schemaMetadata } = useSchema(normalizedSchema as string)

  if (outletContext?.name && outletContext.schemaMetadata) {
    return {
      name: outletContext.name,
      schemaMetadata: outletContext.schemaMetadata,
    }
  }

  if (!schemaMetadata || 'error' in schemaMetadata) {
    return null
  }

  // Type guard: schemaMetadata is SchemaMetadata (not error object)
  const metadata = schemaMetadata as SchemaMetadata

  // Use apiName for routes (kebab-case) and displayName for display, or fallback to names() utility
  const apiName = metadata.apiName || (schema as string)
  const displayName = metadata.displayName
  const name = displayName
    ? { ...names(apiName), title: displayName } // Override title with displayName if available
    : names(apiName) // Use names utility to convert kebab-case to other formats

  return {
    name,
    schemaMetadata,
  }
}
