import { useAdapter } from '@magnet-cms/admin'
import { Button, Input } from '@magnet-cms/ui/components'
import { Plus, Route, Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface VaultSecretMapping {
	path: string
	mapTo: string
	watch?: boolean
}

/**
 * Mappings panel for managing explicit Vault secret path overrides.
 * Provides add/edit/delete for VaultSecretMapping entries.
 */
export function MappingsPanel() {
	const adapter = useAdapter()
	const [mappings, setMappings] = useState<VaultSecretMapping[]>([])
	const [dirty, setDirty] = useState(false)
	const [saving, setSaving] = useState(false)

	const fetchMappings = useCallback(async () => {
		try {
			const data = await adapter.request<{
				mappings: VaultSecretMapping[]
			}>('/api/vault/mappings')
			setMappings(data.mappings)
			setDirty(false)
		} catch {
			setMappings([])
		}
	}, [adapter])

	useEffect(() => {
		fetchMappings()
	}, [fetchMappings])

	const addMapping = () => {
		setMappings([...mappings, { path: '', mapTo: '', watch: false }])
		setDirty(true)
	}

	const removeMapping = (index: number) => {
		setMappings(mappings.filter((_, i) => i !== index))
		setDirty(true)
	}

	const updateMapping = (
		index: number,
		field: keyof VaultSecretMapping,
		value: string | boolean,
	) => {
		const updated = mappings.map((m, i) =>
			i === index ? { ...m, [field]: value } : m,
		)
		setMappings(updated)
		setDirty(true)
	}

	const saveMappings = async () => {
		setSaving(true)
		try {
			const validMappings = mappings.filter((m) => m.path && m.mapTo)
			await adapter.request('/api/vault/mappings', {
				method: 'PUT',
				body: JSON.stringify({ mappings: validMappings }),
				headers: { 'Content-Type': 'application/json' },
			})
			setMappings(validMappings)
			setDirty(false)
		} catch {
			// Error handled by adapter
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Route className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
					<h3 className="text-lg font-medium">Secret Mappings</h3>
				</div>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={addMapping}
					>
						<Plus className="h-4 w-4 mr-1" aria-hidden="true" />
						Add
					</Button>
					{dirty && (
						<Button
							type="button"
							size="sm"
							onClick={saveMappings}
							disabled={saving}
						>
							<Save className="h-4 w-4 mr-1" aria-hidden="true" />
							{saving ? 'Saving...' : 'Save'}
						</Button>
					)}
				</div>
			</div>

			<p className="text-xs text-muted-foreground">
				Override convention-based paths with explicit Vault path mappings. Each
				mapping connects a Vault path to a config module target.
			</p>

			{mappings.length === 0 ? (
				<div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
					No custom mappings configured. Convention-based paths
					(secret/data/magnet/&#123;module&#125;) will be used.
				</div>
			) : (
				<div className="space-y-2">
					<div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
						<span>Vault Path</span>
						<span>Map To</span>
						<span>Watch</span>
						<span />
					</div>
					{mappings.map((mapping, index) => (
						<div
							key={`${mapping.path}-${mapping.mapTo}-${index}`}
							className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center"
						>
							<Input
								value={mapping.path}
								onChange={(e) => updateMapping(index, 'path', e.target.value)}
								placeholder="secret/data/myapp/db"
								className="text-sm font-mono"
							/>
							<Input
								value={mapping.mapTo}
								onChange={(e) => updateMapping(index, 'mapTo', e.target.value)}
								placeholder="database"
								className="text-sm"
							/>
							<label className="flex items-center cursor-pointer">
								<input
									type="checkbox"
									checked={mapping.watch ?? false}
									onChange={(e) =>
										updateMapping(index, 'watch', e.target.checked)
									}
									className="h-4 w-4 rounded border-gray-300"
								/>
							</label>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => removeMapping(index)}
							>
								<Trash2
									className="h-4 w-4 text-destructive"
									aria-hidden="true"
								/>
							</Button>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
