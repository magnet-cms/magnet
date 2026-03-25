import { Alert } from '@magnet-cms/ui'
import { Info, User } from 'lucide-react'

interface InfoPanelProps {
  roleName: string
  dependentCount: number
  auditLog: Array<{
    id: string
    action: string
    timestamp: string
    user: string
  }>
}

export function InfoPanel({ roleName, dependentCount, auditLog }: InfoPanelProps) {
  return (
    <div className="hidden w-80 overflow-y-auto border-l border-border bg-card xl:block">
      <div className="p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Permission Details</h3>

        <div className="space-y-6">
          <Alert className="border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40">
            <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="text-xs leading-relaxed text-blue-800 dark:text-blue-200">
              You are editing the <span className="font-semibold">{roleName}</span> role. Users with
              this role are logged in and verified. Be careful with sensitive operations like{' '}
              <code className="rounded bg-blue-100 px-1 py-0.5 text-blue-900 dark:bg-blue-900/50 dark:text-blue-100">
                delete
              </code>
              .
            </p>
          </Alert>

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dependents
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-md border border-border p-2 transition-colors hover:border-border">
                <div className="flex items-center gap-2">
                  <div className="flex size-6 items-center justify-center rounded bg-muted text-muted-foreground">
                    <User className="size-3.5" />
                  </div>
                  <span className="text-xs text-muted-foreground">Registered Users</span>
                </div>
                <span className="text-xs font-medium text-foreground">
                  {dependentCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <hr className="border-border" />

          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Audit Log
            </h4>
            <ol className="relative ml-1.5 space-y-4 border-l border-border">
              {auditLog.map((log) => (
                <li key={log.id} className="ml-4">
                  <div className="absolute -left-1.5 mt-1.5 size-3 rounded-full border-2 border-background bg-muted" />
                  <p className="text-xs text-muted-foreground">{log.action}</p>
                  <time className="text-[10px] text-muted-foreground/70">{log.timestamp}</time>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
