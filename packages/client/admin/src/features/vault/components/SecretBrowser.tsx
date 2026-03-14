'use client'

import { Button, Skeleton } from '@magnet-cms/ui'
import { Key, Plus, Search, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
	useVaultDeleteSecret,
	useVaultSecret,
	useVaultSecrets,
} from '~/hooks/useVault'
import { useAppIntl } from '~/i18n'
import { SecretDrawer } from './SecretDrawer'

export function SecretBrowser() {
	const intl = useAppIntl()
	const [search, setSearch] = useState('')
	const [drawerOpen, setDrawerOpen] = useState(false)
	const [editingKey, setEditingKey] = useState<string | undefined>(undefined)
	const [viewingKey, setViewingKey] = useState<string | undefined>(undefined)

	const { data, isLoading, error, refetch } = useVaultSecrets()
	const { mutate: deleteSecret } = useVaultDeleteSecret()
	const { data: secretDetail } = useVaultSecret(viewingKey ?? '')

	const allKeys = data?.keys ?? []
	const filteredKeys = search
		? allKeys.filter((k) => k.toLowerCase().includes(search.toLowerCase()))
		: allKeys

	const handleCreate = () => {
		setEditingKey(undefined)
		setViewingKey(undefined)
		setDrawerOpen(true)
	}

	const handleEdit = (key: string) => {
		setViewingKey(key)
		setEditingKey(key)
		setDrawerOpen(true)
	}

	const handleDelete = (key: string) => {
		if (
			!window.confirm(
				intl.formatMessage(
					{
						id: 'vault.secrets.deleteConfirm',
						defaultMessage: 'Delete secret "{key}"?',
					},
					{ key },
				),
			)
		) {
			return
		}

		deleteSecret(key, {
			onSuccess: () => {
				toast.success(
					intl.formatMessage({
						id: 'vault.secrets.deleteSuccess',
						defaultMessage: 'Secret deleted',
					}),
				)
				refetch()
			},
			onError: (err) => {
				toast.error(
					err.message ||
						intl.formatMessage({
							id: 'vault.secrets.deleteError',
							defaultMessage: 'Failed to delete secret',
						}),
				)
			},
		})
	}

	if (isLoading) {
		return (
			<div className="space-y-2">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-14 w-full" />
				))}
			</div>
		)
	}

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4">
				<p className="text-sm text-red-700">
					{error.message || 'Failed to load secrets'}
				</p>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => refetch()}
					className="mt-2"
				>
					Retry
				</Button>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex items-center gap-3">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder={intl.formatMessage({
							id: 'vault.secrets.searchPlaceholder',
							defaultMessage: 'Search secrets...',
						})}
						className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all"
					/>
				</div>
				<Button size="sm" onClick={handleCreate}>
					<Plus className="w-3.5 h-3.5 mr-1.5" />
					{intl.formatMessage({
						id: 'vault.secrets.createSecret',
						defaultMessage: 'New Secret',
					})}
				</Button>
			</div>

			{/* Empty state */}
			{filteredKeys.length === 0 && (
				<div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 flex flex-col items-center justify-center text-center">
					<Key className="w-8 h-8 text-gray-300 mb-3" />
					<p className="text-sm font-medium text-gray-500">
						{search
							? 'No secrets match your search'
							: intl.formatMessage({
									id: 'vault.secrets.empty',
									defaultMessage: 'No secrets stored',
								})}
					</p>
					{!search && (
						<p className="text-xs text-gray-400 mt-1">
							{intl.formatMessage({
								id: 'vault.secrets.emptyDescription',
								defaultMessage: 'Create your first secret to get started',
							})}
						</p>
					)}
					{!search && (
						<Button
							variant="outline"
							size="sm"
							onClick={handleCreate}
							className="mt-4"
						>
							<Plus className="w-3.5 h-3.5 mr-1.5" />
							New Secret
						</Button>
					)}
				</div>
			)}

			{/* Secret list */}
			{filteredKeys.length > 0 && (
				<div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
					{filteredKeys.map((key) => (
						<div
							key={key}
							className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
						>
							<div className="flex items-center gap-3 min-w-0">
								<div className="flex-shrink-0 w-7 h-7 rounded-md bg-gray-100 flex items-center justify-center">
									<Key className="w-3.5 h-3.5 text-gray-500" />
								</div>
								<span className="text-sm font-mono text-gray-800 truncate">
									{key}
								</span>
							</div>
							<div className="flex items-center gap-1 ml-3">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleEdit(key)}
									className="text-xs text-gray-500 hover:text-gray-900"
								>
									Edit
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => handleDelete(key)}
									className="text-red-400 hover:text-red-600 hover:bg-red-50"
								>
									<Trash2 className="w-3.5 h-3.5" />
								</Button>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Drawer */}
			<SecretDrawer
				open={drawerOpen}
				onOpenChange={(open) => {
					setDrawerOpen(open)
					if (!open) {
						setEditingKey(undefined)
						setViewingKey(undefined)
					}
				}}
				editKey={editingKey}
				initialData={editingKey && secretDetail ? secretDetail.data : undefined}
			/>
		</div>
	)
}
