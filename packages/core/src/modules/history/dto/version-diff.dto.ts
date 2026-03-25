/**
 * A single field-level change between two versions.
 */
export interface VersionFieldChange {
  /** The field name */
  field: string
  /** Value in the older version (undefined if field was added) */
  before: unknown
  /** Value in the newer version (undefined if field was removed) */
  after: unknown
  /** Type of change */
  type: 'added' | 'removed' | 'modified'
}

/**
 * Summary of a single version (for display in the diff).
 */
export interface VersionSummary {
  versionId: string
  versionNumber: number
  documentId: string
  schemaName: string
  locale: string
  status: 'draft' | 'published' | 'archived'
  createdAt: Date
  createdBy?: string
  notes?: string
}

/**
 * Result of comparing two versions of a document.
 */
export interface VersionDiff {
  version1: VersionSummary
  version2: VersionSummary
  changes: VersionFieldChange[]
}
