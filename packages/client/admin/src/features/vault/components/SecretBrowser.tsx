'use client'

import {
	Button,
	DataTable,
	type DataTableColumn,
	type DataTableRenderContext,
	Input,
} from '@magnet-cms/ui'
import { Key } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import {
	type VaultSecretMeta,
	useVaultDeleteSecret,
	useVaultSecret,
	useVaultSecrets,
} from '~/hooks/useVault'
import { useAppIntl } from '~/i18n'
import { MaskedSecretCell } from './MaskedSecretCell'
import { SecretDrawer } from './SecretDrawer'

const contentManagerStyles = `
  .table-row-hover:hover td {
    background-color: #F9FAFB;
  }
  .table-row-hover.group:hover td {
    background-color: #F9FAFB;
  }
`

function formatLastUpdated(iso: string | undefined): string {
	if (!iso) return '—'
	const date = new Date(iso)
	if (Number.isNaN(date.getTime())) return '—'
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMins = Math.floor(diffMs / 60000)
	const diffHours = Math.floor(diffMs / 3600000)
	const diffDays = Math.floor(diffMs / 86400000)
	if (diffMins < 1) return 'Just now'
	if (diffMins < 60) return `${diffMins} min ago`
	if (diffHours < 24) return `${diffHours} hr ago`
	if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
	return date.toLocaleDateString()
}

const columns: DataTableColumn<VaultSecretMeta>[] = [
	{
		type: 'custom',
		header: 'Name',
		cell: (row) => (
			<span className="font-mono text-sm text-gray-800">
				{row.original.name}
			</span>
		),
	},
	{
		type: 'custom',
		header: 'Description',
		cell: (row) => (
			<span className="text-sm text-gray-500">
				{row.original.description ?? <span className="text-gray-300">—</span>}
			</span>
		),
	},
	{
		type: 'custom',
		header: 'Secret',
		cell: (row) => <MaskedSecretCell secretName={row.original.name} />,
	},
	{
		type: 'custom',
		header: 'Last updated',
		cell: (row) => (
			<span className="text-sm text-gray-500">
				{formatLastUpdated(row.original.lastUpdated)}
			</span>
		),
	},
]

interface SecretBrowserProps {
	drawerOpen: boolean
	editingKey: string | undefined
	onDrawerOpenChange: (open: boolean) => void
	onEdit: (key: string) => void
}

export function SecretBrowser({
	drawerOpen,
	editingKey,
	onDrawerOpenChange,
	onEdit,
}: SecretBrowserProps) {
	const intl = useAppIntl()
	const [search, setSearch] = useState('')

	const { data, refetch } = useVaultSecrets()
	const { mutate: deleteSecret } = useVaultDeleteSecret()
	const { data: secretDetail } = useVaultSecret(editingKey ?? '')

	const allSecrets = data?.secrets ?? []
	const filteredSecrets = search
		? allSecrets.filter(
				(s) =>
					s.name.toLowerCase().includes(search.toLowerCase()) ||
					s.description?.toLowerCase().includes(search.toLowerCase()),
			)
		: allSecrets

	const handleEdit = (row: VaultSecretMeta) => {
		onEdit(row.name)
	}

	const handleDelete = (row: VaultSecretMeta) => {
		if (
			!window.confirm(
				intl.formatMessage(
					{
						id: 'vault.secrets.deleteConfirm',
						defaultMessage: 'Delete secret "{key}"?',
					},
					{ key: row.name },
				),
			)
		) {
			return
		}

		deleteSecret(row.name, {
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

	const renderToolbar = () => (
		<div className="px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-none bg-white border-b border-gray-200">
			<div className="relative w-full sm:w-80">
				<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<svg
						className="text-gray-400"
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
					>
						<path
							d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="M14 14L11.1 11.1"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
				<Input
					type="text"
					className="pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all shadow-sm"
					placeholder={intl.formatMessage({
						id: 'vault.secrets.searchPlaceholder',
						defaultMessage: 'Search secrets...',
					})}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</div>
			<div className="flex items-center gap-3 w-full sm:w-auto">
				<div className="flex items-center border border-gray-200 rounded-lg p-0.5 bg-gray-50">
					<Button
						variant="ghost"
						size="sm"
						className="px-2 py-1 text-xs font-medium text-gray-600 hover:text-gray-900"
						onClick={() => setSearch('')}
					>
						{intl.formatMessage({
							id: 'common.actions.clearFilters',
							defaultMessage: 'Clear Filters',
						})}
					</Button>
				</div>
			</div>
		</div>
	)

	const renderPagination = (table: DataTableRenderContext<VaultSecretMeta>) => {
		const { pageIndex, pageSize } = table.getState().pagination
		const totalRows = table.getFilteredRowModel().rows.length
		const startRow = pageIndex * pageSize + 1
		const endRow = Math.min((pageIndex + 1) * pageSize, totalRows)
		return (
			<div className="flex-none px-6 py-4 border-t border-gray-200 bg-white flex items-center justify-between">
				<div className="text-xs text-gray-500">
					{intl.formatMessage(
						{
							id: 'common.pagination.showing',
							defaultMessage: 'Showing {start} to {end} of {total} results',
						},
						{
							start: startRow,
							end: endRow,
							total: totalRows,
						},
					)}
				</div>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-400 cursor-not-allowed bg-gray-50"
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
					>
						{intl.formatMessage({
							id: 'common.actions.previous',
							defaultMessage: 'Previous',
						})}
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
					>
						{intl.formatMessage({
							id: 'common.actions.next',
							defaultMessage: 'Next',
						})}
					</Button>
				</div>
			</div>
		)
	}

	return (
		<>
			<style>{contentManagerStyles}</style>
			<DataTable<VaultSecretMeta>
				data={filteredSecrets}
				columns={columns}
				options={{
					rowActions: {
						items: [
							{
								label: intl.formatMessage({
									id: 'common.actions.edit',
									defaultMessage: 'Edit',
								}),
								onSelect: handleEdit,
							},
							{
								label: intl.formatMessage({
									id: 'common.actions.delete',
									defaultMessage: 'Delete',
								}),
								onSelect: handleDelete,
								destructive: true,
							},
						],
					},
				}}
				getRowId={(row) => row.name}
				renderToolbar={renderToolbar}
				renderPagination={renderPagination}
				enablePagination={true}
				pageSizeOptions={[5, 10, 20, 30, 50]}
				initialPagination={{ pageIndex: 0, pageSize: 10 }}
				renderEmpty={() => (
					<div className="py-16 flex flex-col items-center justify-center text-center">
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
					</div>
				)}
				enableColumnFilters={false}
				showCount={false}
				className="h-full flex flex-col"
				variant="content-manager"
			/>

			<SecretDrawer
				open={drawerOpen}
				onOpenChange={onDrawerOpenChange}
				editKey={editingKey}
				initialValue={
					editingKey && secretDetail ? secretDetail.value : undefined
				}
				initialDescription={
					editingKey
						? allSecrets.find((s) => s.name === editingKey)?.description
						: undefined
				}
			/>
		</>
	)
}
