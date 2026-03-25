export type VersionStatus = 'draft' | 'published' | 'archived'

export interface VersionConfig {
  /**
   * Maximum number of versions to keep per document
   */
  max?: number

  /**
   * Enable drafts mode for this schema
   */
  drafts?:
    | boolean
    | {
        /**
         * Auto-publish drafts after a certain time
         */
        autoPublish?: boolean

        /**
         * Require approval before publishing
         */
        requireApproval?: boolean
      }
}

export interface VersionData<T> {
  /**
   * Document ID this version belongs to
   */
  documentId: string

  /**
   * Version ID
   */
  versionId: string

  /**
   * Version status
   */
  status: VersionStatus

  /**
   * Version data
   */
  data: T

  /**
   * Version created at
   */
  createdAt: Date

  /**
   * Version created by
   */
  createdBy?: string

  /**
   * Version notes
   */
  notes?: string
}
