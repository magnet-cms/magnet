import { useAdapter } from '@magnet-cms/admin'
import { Button } from '@magnet-cms/ui/components'
import { ChevronRight, FolderKey, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

/**
 * Secret browser panel for viewing secret paths from Vault.
 * Shows path names and key names (NOT secret values).
 */
export function SecretBrowser() {
	const adapter = useAdapter()
	const [paths, setPaths] = useState<string[]>([])
	const [expandedPath, setExpandedPath] = useState<string | null>(null)
	const [keys, setKeys] = useState<string[]>([])
	const [loading, setLoading] = useState(false)

	const fetchPaths = useCallback(async () => {
		setLoading(true)
		try {
			const data = await adapter.request<{ paths: string[] }>(
				'/api/vault/secrets',
			)
			setPaths(data.paths)
		} catch {
			setPaths([])
		} finally {
			setLoading(false)
		}
	}, [adapter])

	useEffect(() => {
		fetchPaths()
	}, [fetchPaths])

	const handleExpand = async (path: string) => {
		if (expandedPath === path) {
			setExpandedPath(null)
			setKeys([])
			return
		}

		setExpandedPath(path)
		try {
			const data = await adapter.request<{ keys: string[] }>(
				`/api/vault/secrets/${encodeURIComponent(path)}`,
			)
			setKeys(data.keys)
		} catch {
			setKeys([])
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<FolderKey
						className="h-5 w-5 text-muted-foreground"
						aria-hidden="true"
					/>
					<h3 className="text-lg font-medium">Secret Browser</h3>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={fetchPaths}
					disabled={loading}
				>
					<RefreshCw
						className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
						aria-hidden="true"
					/>
				</Button>
			</div>

			{paths.length === 0 ? (
				<div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
					{loading
						? 'Loading...'
						: 'No secrets found. Vault may not be configured or the mount path is empty.'}
				</div>
			) : (
				<div className="rounded-lg border divide-y">
					{paths.map((path) => (
						<div key={path}>
							<button
								type="button"
								className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
								onClick={() => handleExpand(path)}
							>
								<ChevronRight
									className={`h-4 w-4 text-muted-foreground transition-transform ${
										expandedPath === path ? 'rotate-90' : ''
									}`}
									aria-hidden="true"
								/>
								<span className="font-mono">{path}</span>
							</button>
							{expandedPath === path && keys.length > 0 && (
								<div className="pl-10 pb-2 space-y-1">
									{keys.map((key) => (
										<div
											key={key}
											className="text-xs font-mono text-muted-foreground py-0.5"
										>
											{key}
										</div>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}
