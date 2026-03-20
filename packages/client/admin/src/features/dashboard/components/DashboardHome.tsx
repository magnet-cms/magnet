'use client'

import { Badge, Button, Skeleton } from '@magnet-cms/ui'
import {
	Book,
	Box,
	Code2,
	Database,
	FilePen,
	Image,
	Key,
	LogIn,
	LogOut,
	Plus,
	Send,
	Server,
	Settings,
	Trash2,
	Users,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { ActivityRecord } from '~/core/adapters/types'
import { useRecentActivity } from '~/hooks/useActivity'
import { useAuth } from '~/hooks/useAuth'
import { useSchemas } from '~/hooks/useDiscovery'
import { useMediaList, useMediaUrl } from '~/hooks/useMedia'

import { useAppIntl } from '~/i18n'
import { PageHeader } from '../../shared'

import { ActivityFeed } from './ActivityFeed'
import { CollectionCard } from './CollectionCard'
import { MediaLibraryPreview } from './MediaLibraryPreview'
import { StatCard } from './StatCard'

function getActivityDisplay(
	record: ActivityRecord,
	intl: ReturnType<typeof useAppIntl>,
): {
	icon: typeof Plus
	iconBgColor: string
	iconColor: string
	message: string
} {
	switch (record.action) {
		case 'content.created':
			return {
				icon: Plus,
				iconBgColor: 'bg-green-100',
				iconColor: 'text-green-600',
				message: intl.formatMessage(
					{
						id: 'dashboard.activity.contentCreated',
						defaultMessage: 'Created {entityType} entry',
					},
					{ entityType: record.entityType },
				),
			}
		case 'content.updated':
			return {
				icon: FilePen,
				iconBgColor: 'bg-blue-100',
				iconColor: 'text-blue-600',
				message: intl.formatMessage(
					{
						id: 'dashboard.activity.contentUpdated',
						defaultMessage: 'Updated {entityType} entry',
					},
					{ entityType: record.entityType },
				),
			}
		case 'content.deleted':
			return {
				icon: Trash2,
				iconBgColor: 'bg-red-100',
				iconColor: 'text-red-600',
				message: intl.formatMessage(
					{
						id: 'dashboard.activity.contentDeleted',
						defaultMessage: 'Deleted {entityType} entry',
					},
					{ entityType: record.entityType },
				),
			}
		case 'content.published':
			return {
				icon: Send,
				iconBgColor: 'bg-purple-100',
				iconColor: 'text-purple-600',
				message: intl.formatMessage(
					{
						id: 'dashboard.activity.contentPublished',
						defaultMessage: 'Published {entityType} entry',
					},
					{ entityType: record.entityType },
				),
			}
		case 'content.unpublished':
			return {
				icon: FilePen,
				iconBgColor: 'bg-yellow-100',
				iconColor: 'text-yellow-600',
				message: intl.formatMessage(
					{
						id: 'dashboard.activity.contentUnpublished',
						defaultMessage: 'Unpublished {entityType} entry',
					},
					{ entityType: record.entityType },
				),
			}
		case 'user.login':
			return {
				icon: LogIn,
				iconBgColor: 'bg-green-100',
				iconColor: 'text-green-600',
				message: intl.formatMessage({
					id: 'dashboard.activity.userLogin',
					defaultMessage: 'User logged in',
				}),
			}
		case 'user.logout':
			return {
				icon: LogOut,
				iconBgColor: 'bg-muted',
				iconColor: 'text-muted-foreground',
				message: intl.formatMessage({
					id: 'dashboard.activity.userLogout',
					defaultMessage: 'User logged out',
				}),
			}
		case 'user.registered':
			return {
				icon: Users,
				iconBgColor: 'bg-blue-100',
				iconColor: 'text-blue-600',
				message: intl.formatMessage({
					id: 'dashboard.activity.userRegistered',
					defaultMessage: 'New user registered',
				}),
			}
		case 'settings.updated':
		case 'settings.group_updated':
			return {
				icon: Settings,
				iconBgColor: 'bg-orange-100',
				iconColor: 'text-orange-600',
				message: intl.formatMessage({
					id: 'dashboard.activity.settingsUpdated',
					defaultMessage: 'Settings updated',
				}),
			}
		case 'api_key.created':
		case 'api_key.revoked':
			return {
				icon: Key,
				iconBgColor: 'bg-yellow-100',
				iconColor: 'text-yellow-600',
				message:
					record.action === 'api_key.created'
						? intl.formatMessage({
								id: 'dashboard.activity.apiKeyCreated',
								defaultMessage: 'API key created',
							})
						: intl.formatMessage({
								id: 'dashboard.activity.apiKeyRevoked',
								defaultMessage: 'API key revoked',
							}),
			}
		default:
			return {
				icon: Server,
				iconBgColor: 'bg-muted',
				iconColor: 'text-muted-foreground',
				message: record.action,
			}
	}
}

function formatRelativeTime(
	timestamp: string,
	intl: ReturnType<typeof useAppIntl>,
): string {
	const diff = Date.now() - new Date(timestamp).getTime()
	const seconds = Math.floor(diff / 1000)
	if (seconds < 60)
		return intl.formatMessage({
			id: 'dashboard.activity.justNow',
			defaultMessage: 'Just now',
		})
	const minutes = Math.floor(seconds / 60)
	if (minutes < 60)
		return intl.formatRelativeTime(-minutes, 'minute', { style: 'narrow' })
	const hours = Math.floor(minutes / 60)
	if (hours < 24)
		return intl.formatRelativeTime(-hours, 'hour', { style: 'narrow' })
	const days = Math.floor(hours / 24)
	return intl.formatRelativeTime(-days, 'day', { style: 'narrow' })
}

// Stats - these would ideally come from a dedicated dashboard API
// For now, we derive some stats from available data
function useDashboardStats() {
	const intl = useAppIntl()
	const { data: schemas } = useSchemas()
	const { data: mediaData } = useMediaList({ limit: 1 })

	return useMemo(() => {
		const schemaCount = schemas?.length || 0
		const mediaCount = mediaData?.total || 0

		return [
			{
				icon: Database,
				label: intl.formatMessage({
					id: 'dashboard.stats.collections',
					defaultMessage: 'Collections',
				}),
				value: schemaCount.toString(),
				iconBgColor: 'bg-blue-50',
				iconColor: 'text-blue-600',
			},
			{
				icon: Image,
				label: intl.formatMessage({
					id: 'dashboard.stats.mediaAssets',
					defaultMessage: 'Media Assets',
				}),
				value: mediaCount.toString(),
				iconBgColor: 'bg-purple-50',
				iconColor: 'text-purple-600',
			},
			{
				icon: Server,
				label: intl.formatMessage({
					id: 'dashboard.stats.apiStatus',
					defaultMessage: 'API Status',
				}),
				value: intl.formatMessage({
					id: 'common.status.online',
					defaultMessage: 'Online',
				}),
				iconBgColor: 'bg-green-50',
				iconColor: 'text-green-600',
			},
		]
	}, [schemas, mediaData, intl])
}

// Map schema names to icons (can be extended)
function getSchemaIcon(_schemaName: string) {
	// Default to generic Box icon
	// In a full implementation, schema metadata could include icon hints
	return Box
}

export function DashboardHome() {
	const intl = useAppIntl()
	const navigate = useNavigate()
	const { user, isLoading: isUserLoading } = useAuth()
	const { data: schemas, isLoading: isSchemasLoading } = useSchemas()
	const { data: mediaData, isLoading: isMediaLoading } = useMediaList({
		limit: 4,
	})
	const { getThumbnailUrl } = useMediaUrl()
	const { data: recentActivity, isLoading: isActivityLoading } =
		useRecentActivity(5)

	const stats = useDashboardStats()

	// Transform schemas to collection cards
	const collections = useMemo(() => {
		if (!schemas) return []
		return schemas.slice(0, 4).map((schemaName) => ({
			icon: getSchemaIcon(schemaName),
			title:
				schemaName.charAt(0).toUpperCase() +
				schemaName.slice(1).replace(/([A-Z])/g, ' $1'),
			description: intl.formatMessage(
				{
					id: 'dashboard.collections.manageContent',
					defaultMessage: 'Manage {schema} content',
				},
				{ schema: schemaName },
			),
			itemCount: 0,
			href: `/content-manager/${schemaName}`,
			iconBgColor: 'bg-muted',
			iconColor: 'text-muted-foreground',
		}))
	}, [schemas, intl])

	// Transform media items for preview
	const mediaItems = useMemo(() => {
		if (!mediaData?.items) return []
		return mediaData.items
			.filter((item) => item.mimeType.startsWith('image/'))
			.slice(0, 3)
			.map((item) => ({
				id: item.id,
				src: getThumbnailUrl(item.id),
				alt: item.alt || item.originalFilename || 'Media',
			}))
	}, [mediaData, getThumbnailUrl])

	const userName = user?.name || 'User'
	const isLoading = isUserLoading || isSchemasLoading

	return (
		<div className="flex-1 flex flex-col min-w-0 bg-background h-full relative">
			{/* Header Section */}
			<PageHeader>
				{/* Title & Actions */}
				<div className="px-8 py-6 flex items-center justify-between">
					<div>
						{isUserLoading ? (
							<>
								<Skeleton className="h-8 w-64 mb-2" />
								<Skeleton className="h-5 w-80" />
							</>
						) : (
							<>
								<h1 className="text-2xl font-medium text-foreground tracking-tight">
									{intl.formatMessage(
										{
											id: 'dashboard.welcomeBack',
											defaultMessage: 'Welcome back, {userName}',
										},
										{ userName },
									)}
								</h1>
								<p className="mt-1 text-sm text-muted-foreground">
									{intl.formatMessage({
										id: 'dashboard.subtitle',
										defaultMessage: "Here's what's happening in your project.",
									})}
								</p>
							</>
						)}
					</div>
					<div className="flex items-center gap-3">
						<Button variant="outline" size="sm" asChild>
							<a
								href="https://magnet-cms.dev/docs"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Book className="w-4 h-4" />
								{intl.formatMessage({
									id: 'dashboard.documentation',
									defaultMessage: 'Documentation',
								})}
							</a>
						</Button>
						<Button size="sm" onClick={() => navigate('/content-manager')}>
							<Plus className="w-4 h-4" />
							{intl.formatMessage({
								id: 'dashboard.newEntry',
								defaultMessage: 'New Entry',
							})}
						</Button>
					</div>
				</div>
			</PageHeader>

			{/* Scrollable Content */}
			<div className="flex-1 overflow-y-auto bg-muted/50 p-8">
				<div className="w-full space-y-8">
					{/* Quick Stats */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
						{stats.map((stat) => (
							<StatCard key={stat.label} {...stat} />
						))}
					</div>

					{/* Content Collections Grid */}
					<div>
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-sm font-semibold text-foreground">
								{intl.formatMessage({
									id: 'dashboard.collections.title',
									defaultMessage: 'Collections',
								})}
							</h2>
							<Link
								to="/content-manager"
								className="text-xs font-medium text-primary hover:text-primary/90"
							>
								{intl.formatMessage({
									id: 'common.actions.viewAll',
									defaultMessage: 'View all',
								})}
							</Link>
						</div>
						{isLoading ? (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
								{['c1', 'c2', 'c3', 'c4'].map((id) => (
									<Skeleton key={id} className="h-32 rounded-xl" />
								))}
							</div>
						) : collections.length === 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
								<div className="col-span-full text-center py-8 bg-card rounded-xl border border-dashed border-border">
									<Database className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
									<p className="text-sm text-muted-foreground mb-3">
										{intl.formatMessage({
											id: 'dashboard.collections.noCollections',
											defaultMessage: 'No collections yet',
										})}
									</p>
									<Button
										size="sm"
										variant="outline"
										onClick={() => navigate('/schema-builder')}
									>
										<Plus className="w-4 h-4" />
										{intl.formatMessage({
											id: 'dashboard.collections.createFirstSchema',
											defaultMessage: 'Create your first schema',
										})}
									</Button>
								</div>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
								{collections.map((collection) => (
									<CollectionCard key={collection.title} {...collection} />
								))}
								{collections.length < 4 && (
									<CollectionCard
										icon={Plus}
										title={intl.formatMessage({
											id: 'dashboard.collections.createNewType',
											defaultMessage: 'Create new type',
										})}
										description={intl.formatMessage({
											id: 'dashboard.collections.addNewSchema',
											defaultMessage: 'Add a new schema',
										})}
										itemCount={0}
										href="/schema-builder"
										isCreateNew
										onCreateNew={() => navigate('/schema-builder')}
									/>
								)}
							</div>
						)}
					</div>

					{/* Media Library and Recent Activity */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						<div className="lg:col-span-2">
							{isMediaLoading ? (
								<Skeleton className="h-48 rounded-xl" />
							) : (
								<MediaLibraryPreview
									media={mediaItems}
									onUpload={() => navigate('/media')}
									onViewImage={(id) => navigate(`/media?view=${id}`)}
								/>
							)}
						</div>

						{isActivityLoading ? (
							<Skeleton className="h-48 rounded-xl" />
						) : (
							<ActivityFeed
								activities={
									recentActivity && recentActivity.length > 0
										? recentActivity.map((record) => {
												const display = getActivityDisplay(record, intl)
												return {
													id: record.id,
													icon: display.icon,
													iconBgColor: display.iconBgColor,
													iconColor: display.iconColor,
													message: display.message,
													timestamp: formatRelativeTime(record.timestamp, intl),
												}
											})
										: [
												{
													id: 'empty',
													iconBgColor: 'bg-green-100',
													iconColor: 'text-green-600',
													message: intl.formatMessage({
														id: 'dashboard.activity.noActivity',
														defaultMessage: 'No activity yet',
													}),
													timestamp: '',
												},
											]
								}
								onViewAll={() => navigate('/activity')}
							/>
						)}
					</div>

					{/* Footer Links */}
					<div className="border-t border-border pt-8 pb-10">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<a
								href="https://magnet-cms.dev/docs/api"
								target="_blank"
								rel="noopener noreferrer"
								className="bg-linear-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-md relative overflow-hidden group cursor-pointer block"
							>
								<div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
								<div className="relative z-10">
									<Code2 className="w-8 h-8 mb-4 text-white/60" />
									<h3 className="text-base font-semibold mb-2">
										{intl.formatMessage({
											id: 'dashboard.footer.apiDocs',
											defaultMessage: 'API Documentation',
										})}
									</h3>
									<p className="text-sm text-white/70 mb-4">
										{intl.formatMessage({
											id: 'dashboard.footer.apiDocsDescription',
											defaultMessage:
												'Learn how to consume your content via REST or GraphQL APIs.',
										})}
									</p>
									<Badge className="text-xs font-medium bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors">
										{intl.formatMessage({
											id: 'dashboard.footer.readDocs',
											defaultMessage: 'Read Docs',
										})}
									</Badge>
								</div>
							</a>

							<Link
								to="/users"
								className="bg-card rounded-xl shadow-sm ring-1 ring-border p-6 relative overflow-hidden group cursor-pointer hover:ring-primary/40 transition-all block"
							>
								<div className="relative z-10">
									<div className="flex items-center justify-between mb-4">
										<Users className="w-8 h-8 text-primary" />
										<span className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all">
											→
										</span>
									</div>
									<h3 className="text-base font-semibold text-foreground mb-2">
										{intl.formatMessage({
											id: 'dashboard.footer.manageTeam',
											defaultMessage: 'Manage Team',
										})}
									</h3>
									<p className="text-sm text-muted-foreground">
										{intl.formatMessage({
											id: 'dashboard.footer.manageTeamDescription',
											defaultMessage:
												'Invite new members, manage roles and permissions for your project.',
										})}
									</p>
								</div>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
