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
			<span className="font-mono text-sm text-foreground">
				{row.original.name}
			</span>
		),
	},
	{
		type: 'custom',
		header: 'Description',
		cell: (row) => (
			<span className="text-sm text-muted-foreground">
				{row.original.description ?? (
					<span className="text-muted-foreground/50">—</span>
				)}
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
			<span className="text-sm text-muted-foreground">
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
		<div className="flex-none flex flex-col gap-3 border-b border-border bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
			<div className="relative w-full sm:w-80">
				<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
					<svg
						className="text-muted-foreground"
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
					className="rounded-lg border border-input bg-muted/50 py-1.5 pl-9 pr-3 text-sm shadow-sm transition-all placeholder:text-muted-foreground focus-visible:bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					placeholder={intl.formatMessage({
						id: 'vault.secrets.searchPlaceholder',
						defaultMessage: 'Search secrets...',
					})}
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</div>
			<div className="flex w-full items-center gap-3 sm:w-auto">
				<div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
					<Button
						variant="ghost"
						size="sm"
						className="px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
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
			<div className="flex-none flex items-center justify-between border-t border-border bg-background px-6 py-4">
				<div className="text-xs text-muted-foreground">
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
						className="cursor-not-allowed rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground/50"
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
						className="rounded-md px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
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
					<div className="flex flex-col items-center justify-center py-16 text-center">
						<Key className="mb-3 size-8 text-muted-foreground/40" />
						<p className="text-sm font-medium text-muted-foreground">
							{search
								? 'No secrets match your search'
								: intl.formatMessage({
										id: 'vault.secrets.empty',
										defaultMessage: 'No secrets stored',
									})}
						</p>
						{!search && (
							<p className="mt-1 text-xs text-muted-foreground/70">
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
