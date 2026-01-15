import {
	Avatar,
	AvatarFallback,
	Button,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	Spinner,
} from '@magnet/ui/components'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ChevronDown } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ContentHeader } from '~/components/ContentHeader'
import { useAdapter } from '~/core/provider/MagnetProvider'
import { useContentManager } from '~/hooks/useContentManager'

interface Version {
	versionId: string
	status: 'draft' | 'published' | 'archived'
	createdAt: string
	createdBy?: string
	notes?: string
	data: Record<string, unknown>
}

interface HistoryAdapter {
	getVersions: (id: string, collection: string) => Promise<Version[]>
	getVersion: (versionId: string) => Promise<Version>
	publishVersion: (versionId: string) => Promise<void>
	archiveVersion: (versionId: string) => Promise<void>
	deleteVersion: (versionId: string) => Promise<void>
}

const getInitials = (name?: string): string => {
	if (!name) return '?'
	const parts = name.trim().split(/\s+/)
	if (parts.length === 1) {
		return (parts[0] ?? '').substring(0, 2).toUpperCase()
	}
	const first = parts[0]?.[0] ?? ''
	const last = parts[parts.length - 1]?.[0] ?? ''
	return (first + last).toUpperCase()
}

const getChangedFields = (
	currentData: Record<string, unknown>,
	previousData?: Record<string, unknown>,
): string[] => {
	if (!previousData) return []
	const changes: string[] = []
	for (const key of Object.keys(currentData)) {
		const currentVal = currentData[key]
		const prevVal = previousData[key]
		if (JSON.stringify(currentVal) !== JSON.stringify(prevVal)) {
			const formatValue = (val: unknown): string => {
				if (val === null || val === undefined) return 'null'
				if (typeof val === 'object') return JSON.stringify(val)
				return String(val)
			}
			changes.push(
				`${key}: ${formatValue(prevVal)} → ${formatValue(currentVal)}`,
			)
		}
	}
	return changes
}

const ContentManagerViewerVersions = () => {
	const { id, schema: schemaName } = useParams()
	const queryClient = useQueryClient()
	const adapter = useAdapter()

	const contentManager = useContentManager()
	if (!contentManager) return <Spinner />

	const { name } = contentManager

	const basePath = `/content-manager/${name.key}/${id}`

	const tabs = [
		{ label: 'Edit', to: '' },
		{ label: 'Versions', to: 'versions' },
		{ label: 'API', to: 'api' },
	]

	const historyAdapter = (adapter as unknown as { history: HistoryAdapter })
		.history

	const { data: versions, isLoading: isLoadingVersions } = useQuery({
		queryKey: ['versions', schemaName, id],
		queryFn: () => historyAdapter.getVersions(id as string, name.key),
		enabled: !!id,
	})

	const restoreMutation = useMutation({
		mutationFn: (versionId: string) => {
			return historyAdapter.publishVersion(versionId)
		},
		onSuccess: () => {
			toast.success('Version restored', {
				description: 'The selected version has been published',
			})
			queryClient.invalidateQueries({ queryKey: ['versions', schemaName, id] })
		},
		onError: (error) => {
			toast.error(`Failed to restore version: ${error.message}`)
		},
	})

	const publishMutation = useMutation({
		mutationFn: (versionId: string) => {
			return historyAdapter.publishVersion(versionId)
		},
		onSuccess: () => {
			toast.success('Version published', {
				description: 'The draft has been published successfully',
			})
			queryClient.invalidateQueries({ queryKey: ['versions', schemaName, id] })
		},
		onError: (error) => {
			toast.error(`Failed to publish draft: ${error.message}`)
		},
	})

	const archiveMutation = useMutation({
		mutationFn: (versionId: string) => {
			return historyAdapter.archiveVersion(versionId)
		},
		onSuccess: () => {
			toast.success('Version archived', {
				description: 'The version has been archived successfully',
			})
			queryClient.invalidateQueries({ queryKey: ['versions', schemaName, id] })
		},
		onError: (error) => {
			toast.error(`Failed to archive version: ${error.message}`)
		},
	})

	const deleteMutation = useMutation({
		mutationFn: (versionId: string) => {
			return historyAdapter.deleteVersion(versionId)
		},
		onSuccess: () => {
			toast.success('Version deleted', {
				description: 'The version has been deleted successfully',
			})
			queryClient.invalidateQueries({ queryKey: ['versions', schemaName, id] })
		},
		onError: (error) => {
			toast.error(`Failed to delete version: ${error.message}`)
		},
	})

	if (isLoadingVersions) return <Spinner />

	if (!versions)
		return <div>No versions found for this {name.title.toLowerCase()}</div>

	const sortedVersions = [...versions].sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	)

	const formatRelativeDate = (dateString: string) => {
		return formatDistanceToNow(new Date(dateString), { addSuffix: true })
	}

	const getVersionTitle = (version: Version, index: number) => {
		if (version.status === 'draft') return 'Current Draft'
		if (index === sortedVersions.length - 1) return 'Initial Creation'
		if (version.notes) return version.notes
		return `${version.status.charAt(0).toUpperCase() + version.status.slice(1)} Version`
	}

	return (
		<div className="flex flex-col w-full min-h-0">
			<ContentHeader basePath={basePath} title={name.title} tabs={tabs} />

			<div className="flex-1 overflow-y-auto p-8">
				<div className="max-w-5xl mx-auto space-y-6">
					{/* Header */}
					<div>
						<h2 className="text-lg font-semibold text-foreground">
							Version History
						</h2>
						<p className="text-sm text-muted-foreground mt-1">
							View and restore previous versions of this entry.
						</p>
					</div>

					{/* Timeline */}
					<div className="relative pl-6 border-l border-border space-y-6">
						{sortedVersions.map((version, index) => {
							const previousVersion = sortedVersions[index + 1]
							const changedFields = getChangedFields(
								version.data,
								previousVersion?.data,
							)
							const isDraft = version.status === 'draft'

							return (
								<div key={version.versionId} className="relative">
									{/* Timeline dot */}
									<div
										className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-background ${
											isDraft ? 'bg-amber-400' : 'bg-muted-foreground/30'
										}`}
									/>

									{/* Version card */}
									<div
										className={`p-4 rounded-lg border transition-all ${
											isDraft
												? 'bg-muted/50 border-border'
												: 'border-border hover:bg-muted/30'
										}`}
									>
										<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
											<div className="flex gap-3">
												<Avatar className="h-8 w-8">
													<AvatarFallback className="text-xs font-semibold bg-muted">
														{getInitials(version.createdBy)}
													</AvatarFallback>
												</Avatar>
												<div>
													<div className="flex items-center gap-2 flex-wrap">
														<span className="text-sm font-medium text-foreground">
															{getVersionTitle(version, index)}
														</span>
														{isDraft && (
															<span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
																Unpublished
															</span>
														)}
														{version.status === 'published' && (
															<span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
																Published
															</span>
														)}
														{version.status === 'archived' && (
															<span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border">
																Archived
															</span>
														)}
													</div>
													<p className="text-xs text-muted-foreground mt-1">
														{version.createdBy ? (
															<>
																Edited by{' '}
																<span className="text-foreground">
																	{version.createdBy}
																</span>{' '}
																• {formatRelativeDate(version.createdAt)}
															</>
														) : (
															formatRelativeDate(version.createdAt)
														)}
													</p>
												</div>
											</div>

											{/* Action buttons */}
											<div className="flex gap-2 shrink-0">
												{isDraft && (
													<Button
														size="sm"
														variant="outline"
														onClick={() =>
															publishMutation.mutate(version.versionId)
														}
														disabled={publishMutation.isPending}
													>
														{publishMutation.isPending
															? 'Publishing...'
															: 'Publish'}
													</Button>
												)}

												{version.status === 'published' && (
													<Button
														size="sm"
														variant="outline"
														onClick={() =>
															archiveMutation.mutate(version.versionId)
														}
														disabled={archiveMutation.isPending}
													>
														{archiveMutation.isPending
															? 'Archiving...'
															: 'Archive'}
													</Button>
												)}

												{version.status === 'archived' && (
													<Button
														size="sm"
														variant="outline"
														onClick={() =>
															restoreMutation.mutate(version.versionId)
														}
														disabled={restoreMutation.isPending}
													>
														{restoreMutation.isPending
															? 'Restoring...'
															: 'Restore'}
													</Button>
												)}

												<Button
													size="sm"
													variant="ghost"
													className="text-destructive hover:text-destructive hover:bg-destructive/10"
													onClick={() =>
														deleteMutation.mutate(version.versionId)
													}
													disabled={deleteMutation.isPending}
												>
													{deleteMutation.isPending ? 'Deleting...' : 'Delete'}
												</Button>
											</div>
										</div>

										{/* Change badges */}
										{changedFields.length > 0 && (
											<div className="mt-3 ml-11 flex flex-wrap gap-2">
												{changedFields.slice(0, 3).map((change) => (
													<span
														key={change}
														className="inline-flex items-center px-2 py-1 rounded-md bg-background border text-[10px] text-muted-foreground font-mono"
													>
														{change.length > 40
															? `${change.substring(0, 40)}...`
															: change}
													</span>
												))}
												{changedFields.length > 3 && (
													<span className="inline-flex items-center px-2 py-1 rounded-md bg-background border text-[10px] text-muted-foreground">
														+{changedFields.length - 3} more
													</span>
												)}
											</div>
										)}

										{/* Content preview collapsible */}
										<Collapsible className="mt-4 ml-11">
											<CollapsibleTrigger className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide rounded-md border bg-background hover:bg-muted/50 transition-colors group">
												<ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
												Content Preview
											</CollapsibleTrigger>
											<CollapsibleContent className="mt-2">
												<pre className="text-xs overflow-auto p-4 bg-muted/50 rounded-lg border max-h-[400px] font-mono">
													{JSON.stringify(version.data, null, 2)}
												</pre>
											</CollapsibleContent>
										</Collapsible>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			</div>
		</div>
	)
}

export default ContentManagerViewerVersions
