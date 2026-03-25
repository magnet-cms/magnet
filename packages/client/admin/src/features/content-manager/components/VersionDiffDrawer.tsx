'use client'

import { Badge, Button, Skeleton } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import { X } from 'lucide-react'

import { useVersionComparison } from '~/hooks/useActivity'
import { useAppIntl } from '~/i18n'

interface VersionDiffDrawerProps {
  versionId1: string
  versionId2: string
  onClose: () => void
}

export function VersionDiffDrawer({ versionId1, versionId2, onClose }: VersionDiffDrawerProps) {
  const intl = useAppIntl()
  const { data, isLoading, error } = useVersionComparison(versionId1, versionId2)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={-1}
        aria-label="Close version diff"
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 flex h-full w-[480px] max-w-full flex-col border-l border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {intl.formatMessage({
                id: 'contentManager.diff.title',
                defaultMessage: 'Version Comparison',
              })}
            </h2>
            {data && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                v{data.version1.versionNumber} → v{data.version2.versionNumber}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg p-4">
              {intl.formatMessage(
                {
                  id: 'contentManager.diff.failedToLoad',
                  defaultMessage: 'Failed to load comparison: {error}',
                },
                { error: error.message },
              )}
            </div>
          )}

          {data && data.changes.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {intl.formatMessage({
                id: 'contentManager.diff.noDifferences',
                defaultMessage: 'No differences between these versions.',
              })}
            </div>
          )}

          {data && data.changes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {intl.formatMessage(
                  {
                    id: 'contentManager.diff.fieldsChanged',
                    defaultMessage:
                      '{count, plural, one {# field changed} other {# fields changed}}',
                  },
                  { count: data.changes.length },
                )}
              </p>
              {data.changes.map((change) => (
                <div
                  key={change.field}
                  className={cn(
                    'rounded-lg border p-4',
                    change.type === 'added' &&
                      'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
                    change.type === 'removed' &&
                      'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
                    change.type === 'modified' &&
                      'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30',
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-foreground">{change.field}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        change.type === 'added' &&
                          'border-green-300 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-900/40 dark:text-green-300',
                        change.type === 'removed' &&
                          'border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/40 dark:text-red-300',
                        change.type === 'modified' &&
                          'border-yellow-300 bg-yellow-100 text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
                      )}
                    >
                      {change.type}
                    </Badge>
                  </div>

                  {change.type !== 'added' && (
                    <div className="mb-1">
                      <span className="mb-0.5 block text-xs text-muted-foreground">
                        {intl.formatMessage({
                          id: 'contentManager.diff.before',
                          defaultMessage: 'Before',
                        })}
                      </span>
                      <pre className="overflow-x-auto rounded border border-red-200 bg-muted/50 p-2 text-xs text-red-700 dark:border-red-800 dark:text-red-300">
                        {JSON.stringify(change.before, null, 2)}
                      </pre>
                    </div>
                  )}
                  {change.type !== 'removed' && (
                    <div>
                      <span className="mb-0.5 block text-xs text-muted-foreground">
                        {intl.formatMessage({
                          id: 'contentManager.diff.after',
                          defaultMessage: 'After',
                        })}
                      </span>
                      <pre className="overflow-x-auto rounded border border-green-200 bg-muted/50 p-2 text-xs text-green-700 dark:border-green-800 dark:text-green-300">
                        {JSON.stringify(change.after, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
