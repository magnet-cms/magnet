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
    <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto hidden xl:block">
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Permission Details</h3>

        <div className="space-y-6">
          <Alert className="bg-blue-50 border-blue-100">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <p className="text-xs text-blue-800 leading-relaxed">
              You are editing the <span className="font-semibold">{roleName}</span> role. Users with
              this role are logged in and verified. Be careful with sensitive operations like{' '}
              <code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900">delete</code>.
            </p>
          </Alert>

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Dependents
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-md border border-gray-100 hover:border-gray-300 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs text-gray-600">Registered Users</span>
                </div>
                <span className="text-xs font-medium text-gray-900">
                  {dependentCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Audit Log
            </h4>
            <ol className="relative border-l border-gray-200 ml-1.5 space-y-4">
              {auditLog.map((log) => (
                <li key={log.id} className="ml-4">
                  <div className="absolute w-3 h-3 bg-gray-200 rounded-full mt-1.5 -left-1.5 border border-white" />
                  <p className="text-xs text-gray-500">{log.action}</p>
                  <time className="text-[10px] text-gray-400">{log.timestamp}</time>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
