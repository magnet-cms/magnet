'use client'

import { Skeleton } from '@magnet-cms/ui'
import { names } from '@magnet-cms/utils'
import { Box, Database } from 'lucide-react'
import { useMemo } from 'react'
import { PageHeader } from '~/features/shared'
import { useSchemas } from '~/hooks/useDiscovery'
import { useAppIntl } from '~/i18n'

import { CollectionCard } from '~/features/dashboard/components/CollectionCard'

export function ContentManagerHomePage() {
	const intl = useAppIntl()
	const { data: schemas, isLoading } = useSchemas()

	const collections = useMemo(() => {
		if (!schemas) return []
		return schemas
			.filter((s) => s.toLowerCase() !== 'media')
			.map((schemaName) => {
				const schemaNames = names(schemaName)
				return {
					key: schemaName,
					icon: Box,
					title: schemaNames.title,
					description: intl.formatMessage(
						{
							id: 'contentManager.home.manageContent',
							defaultMessage: 'Manage {title} content',
						},
						{ title: schemaNames.title },
					),
					itemCount: 0,
					href: `/content-manager/${schemaName}`,
					iconBgColor: 'bg-gray-50',
					iconColor: 'text-gray-600',
				}
			})
	}, [schemas, intl])

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
			<PageHeader>
				<div className="px-8 py-6">
					<h1 className="text-2xl font-medium text-gray-900 tracking-tight">
						{intl.formatMessage({
							id: 'contentManager.home.title',
							defaultMessage: 'Content Manager',
						})}
					</h1>
					<p className="mt-1 text-sm text-gray-500">
						{intl.formatMessage({
							id: 'contentManager.home.subtitle',
							defaultMessage: 'Select a collection to manage its content.',
						})}
					</p>
				</div>
			</PageHeader>

			<div className="flex-1 overflow-y-auto bg-gray-50/50 p-8">
				{isLoading ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{['s1', 's2', 's3', 's4'].map((id) => (
							<Skeleton key={id} className="h-32 rounded-xl" />
						))}
					</div>
				) : collections.length === 0 ? (
					<div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
						<Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
						<p className="text-sm text-gray-500">
							{intl.formatMessage({
								id: 'contentManager.home.noCollections',
								defaultMessage: 'No collections yet',
							})}
						</p>
						<p className="mt-1 text-xs text-gray-400">
							{intl.formatMessage({
								id: 'contentManager.home.createSchema',
								defaultMessage: 'Create a schema to get started.',
							})}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{collections.map(({ key, ...collection }) => (
							<CollectionCard key={key} {...collection} />
						))}
					</div>
				)}
			</div>
		</div>
	)
}
