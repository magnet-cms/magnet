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

export function VersionDiffDrawer({
	versionId1,
	versionId2,
	onClose,
}: VersionDiffDrawerProps) {
	const intl = useAppIntl()
	const { data, isLoading, error } = useVersionComparison(
		versionId1,
		versionId2,
	)

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
			<div className="fixed top-0 right-0 h-full w-[480px] max-w-full bg-white shadow-xl z-50 flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
					<div>
						<h2 className="text-base font-semibold text-gray-900">
							{intl.formatMessage({
								id: 'contentManager.diff.title',
								defaultMessage: 'Version Comparison',
							})}
						</h2>
						{data && (
							<p className="text-xs text-gray-500 mt-0.5">
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
								// biome-ignore lint/suspicious/noArrayIndexKey: skeleton
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
						<div className="text-center py-12 text-sm text-gray-500">
							{intl.formatMessage({
								id: 'contentManager.diff.noDifferences',
								defaultMessage: 'No differences between these versions.',
							})}
						</div>
					)}

					{data && data.changes.length > 0 && (
						<div className="space-y-3">
							<p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
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
										change.type === 'added' && 'bg-green-50 border-green-200',
										change.type === 'removed' && 'bg-red-50 border-red-200',
										change.type === 'modified' &&
											'bg-yellow-50 border-yellow-200',
									)}
								>
									<div className="flex items-center gap-2 mb-2">
										<span className="text-sm font-medium text-gray-900">
											{change.field}
										</span>
										<Badge
											variant="outline"
											className={cn(
												'text-xs',
												change.type === 'added' &&
													'bg-green-100 text-green-700 border-green-300',
												change.type === 'removed' &&
													'bg-red-100 text-red-700 border-red-300',
												change.type === 'modified' &&
													'bg-yellow-100 text-yellow-700 border-yellow-300',
											)}
										>
											{change.type}
										</Badge>
									</div>

									{change.type !== 'added' && (
										<div className="mb-1">
											<span className="text-xs text-gray-500 block mb-0.5">
												{intl.formatMessage({
													id: 'contentManager.diff.before',
													defaultMessage: 'Before',
												})}
											</span>
											<pre className="text-xs bg-white/60 rounded p-2 overflow-x-auto text-red-700 border border-red-100">
												{JSON.stringify(change.before, null, 2)}
											</pre>
										</div>
									)}
									{change.type !== 'removed' && (
										<div>
											<span className="text-xs text-gray-500 block mb-0.5">
												{intl.formatMessage({
													id: 'contentManager.diff.after',
													defaultMessage: 'After',
												})}
											</span>
											<pre className="text-xs bg-white/60 rounded p-2 overflow-x-auto text-green-700 border border-green-100">
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
