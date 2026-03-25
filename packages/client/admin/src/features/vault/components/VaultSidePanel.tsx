'use client'

import { Button, ScrollArea } from '@magnet-cms/ui'
import { AlertTriangle, CheckCircle2, Database, RefreshCw, Server, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { useVaultClearCache, useVaultStatus } from '~/hooks/useVault'
import { useAppIntl } from '~/i18n'

const ADAPTER_LABELS: Record<string, string> = {
  db: 'Database (built-in)',
  hashicorp: 'HashiCorp Vault',
  supabase: 'Supabase Vault',
}

const ADAPTER_ICONS: Record<string, typeof Database> = {
  db: Database,
  hashicorp: Server,
  supabase: Server,
}

export function VaultSidePanel() {
  const intl = useAppIntl()
  const { data: status, isLoading, refetch } = useVaultStatus()
  const { mutate: clearCache, isPending: isClearingCache } = useVaultClearCache()

  const handleClearCache = () => {
    clearCache(undefined, {
      onSuccess: () => {
        toast.success(
          intl.formatMessage({
            id: 'vault.cache.clearSuccess',
            defaultMessage: 'Cache cleared',
          }),
        )
      },
      onError: () => {
        toast.error(
          intl.formatMessage({
            id: 'vault.cache.clearError',
            defaultMessage: 'Failed to clear cache',
          }),
        )
      },
    })
  }

  return (
    <aside className="w-80 bg-card border-l border-border hidden md:flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Vault Status
        </h3>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Adapter info */}
          {!isLoading && status && (
            <>
              <div className="rounded-lg border border-border bg-muted/50 p-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    {(() => {
                      const Icon = ADAPTER_ICONS[status.adapter] ?? Server
                      return (
                        <div className="rounded-full bg-muted flex items-center justify-center w-8 h-8">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {ADAPTER_LABELS[status.adapter] ?? status.adapter}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Active adapter</p>
                  </div>
                  <div>
                    {status.healthy ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {intl.formatMessage({
                          id: 'vault.status.healthy',
                          defaultMessage: 'Healthy',
                        })}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
                        <XCircle className="w-3 h-3" />
                        {intl.formatMessage({
                          id: 'vault.status.unhealthy',
                          defaultMessage: 'Unhealthy',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Master key warning (DB adapter only) */}
              {status.adapter === 'db' && (
                <div
                  className={`rounded-lg border p-3 ${
                    status.masterKeyConfigured
                      ? 'border-green-200 bg-green-50'
                      : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {status.masterKeyConfigured ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p
                        className={`text-xs font-medium ${
                          status.masterKeyConfigured ? 'text-green-800' : 'text-amber-800'
                        }`}
                      >
                        {status.masterKeyConfigured
                          ? intl.formatMessage({
                              id: 'vault.status.masterKey.configured',
                              defaultMessage: 'VAULT_MASTER_KEY is configured',
                            })
                          : intl.formatMessage({
                              id: 'vault.status.masterKey.missing',
                              defaultMessage: 'VAULT_MASTER_KEY is not set',
                            })}
                      </p>
                      {!status.masterKeyConfigured && (
                        <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                          Generate one with:
                          <code className="block mt-1 font-mono text-[10px] bg-amber-100 px-1.5 py-0.5 rounded break-all">
                            node -e
                            &quot;console.log(require(&apos;crypto&apos;).randomBytes(32).toString(&apos;hex&apos;))&quot;
                          </code>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Cache management */}
          <div className="border-t border-border pt-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Secret Cache
            </h4>
            <div className="rounded-lg border border-border bg-muted/50 p-3">
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                Clear the in-memory cache to force re-fetching secrets from the vault backend.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleClearCache}
                disabled={isClearingCache}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 mr-1.5 ${isClearingCache ? 'animate-spin' : ''}`}
                />
                {intl.formatMessage({
                  id: 'vault.cache.clearButton',
                  defaultMessage: 'Clear Cache',
                })}
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  )
}
