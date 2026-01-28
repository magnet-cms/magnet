'use client'

import type { SchemaProperty } from '@magnet-cms/common'
import type { ReactElement } from 'react'

interface RelationsAndMetadataPanelProps {
  // Relationship fields from the schema
  relationshipFields?: SchemaProperty[]
  // Side panel fields from the schema
  sidePanelFields?: SchemaProperty[]
  // Function to render a field (passed from FormBuilder)
  renderField?: (prop: SchemaProperty) => ReactElement
  // Metadata for display
  metadata?: {
    createdAt?: string | Date
    updatedAt?: string | Date
    publishedAt?: string | Date
  }
  // Optional - if false, relations section won't be shown (for read-only views)
  showRelations?: boolean
}

/**
 * Format a date for display
 */
function formatRelativeDate(date: string | Date | undefined): string {
  if (!date) return 'Never'

  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return 'Never'

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

export function RelationsAndMetadataPanel({
  relationshipFields = [],
  sidePanelFields = [],
  renderField,
  metadata,
  showRelations = true,
}: RelationsAndMetadataPanelProps) {
  const hasRelations = showRelations && relationshipFields.length > 0 && renderField
  const hasSidePanelFields = sidePanelFields.length > 0 && renderField

  return (
    <aside className="w-80 shrink-0 bg-white border-l border-gray-200 hidden md:flex flex-col overflow-y-auto">
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Relationship fields */}
          {hasRelations && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Relations
              </h2>
              <div className="space-y-4">
                {relationshipFields.map((prop) => (
                  <div key={prop.name}>{renderField(prop)}</div>
                ))}
              </div>
            </div>
          )}

          {/* Side panel fields */}
          {hasSidePanelFields && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Additional Info
              </h2>
              <div className="space-y-4">
                {sidePanelFields.map((prop) => (
                  <div key={prop.name}>{renderField(prop)}</div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata - Always visible */}
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Metadata
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Created</span>
                <span className="font-medium text-gray-900">
                  {formatRelativeDate(metadata?.createdAt)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Updated</span>
                <span className="font-medium text-gray-900">
                  {formatRelativeDate(metadata?.updatedAt)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Last Published</span>
                <span className="font-medium text-gray-900">
                  {formatRelativeDate(metadata?.publishedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
