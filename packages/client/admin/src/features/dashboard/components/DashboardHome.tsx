'use client'

import { Badge, Button, Skeleton } from '@magnet-cms/ui'
import {
  Book,
  Box,
  Code2,
  Database,
  Image,
  Plus,
  Server,
  Users,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useSchemas } from '~/hooks/useDiscovery'
import { useMediaList, useMediaUrl } from '~/hooks/useMedia'
import { useAuth } from '~/hooks/useAuth'

import { PageHeader } from '../../shared'

import { ActivityFeed } from './ActivityFeed'
import { CollectionCard } from './CollectionCard'
import { MediaLibraryPreview } from './MediaLibraryPreview'
import { StatCard } from './StatCard'

// Stats - these would ideally come from a dedicated dashboard API
// For now, we derive some stats from available data
function useDashboardStats() {
  const { data: schemas } = useSchemas()
  const { data: mediaData } = useMediaList({ limit: 1 })

  return useMemo(() => {
    const schemaCount = schemas?.length || 0
    const mediaCount = mediaData?.total || 0

    return [
      {
        icon: Database,
        label: 'Collections',
        value: schemaCount.toString(),
        iconBgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
      {
        icon: Image,
        label: 'Media Assets',
        value: mediaCount.toString(),
        iconBgColor: 'bg-purple-50',
        iconColor: 'text-purple-600',
      },
      {
        icon: Server,
        label: 'API Status',
        value: 'Online',
        iconBgColor: 'bg-green-50',
        iconColor: 'text-green-600',
      },
    ]
  }, [schemas, mediaData])
}

// Map schema names to icons (can be extended)
function getSchemaIcon(_schemaName: string) {
  // Default to generic Box icon
  // In a full implementation, schema metadata could include icon hints
  return Box
}

// Placeholder activities - would need a dedicated activity/audit log API
const placeholderActivities = [
  {
    id: '1',
    userInitials: 'SY',
    message: (
      <>
        <span className="font-medium">System</span> is ready for use
      </>
    ),
    timestamp: 'Just now',
    iconBgColor: 'bg-green-100',
    iconColor: 'text-green-600',
  },
]

export function DashboardHome() {
  const navigate = useNavigate()
  const { user, isLoading: isUserLoading } = useAuth()
  const { data: schemas, isLoading: isSchemasLoading } = useSchemas()
  const { data: mediaData, isLoading: isMediaLoading } = useMediaList({ limit: 4 })
  const { getThumbnailUrl } = useMediaUrl()

  const stats = useDashboardStats()

  // Transform schemas to collection cards
  const collections = useMemo(() => {
    if (!schemas) return []
    return schemas.slice(0, 4).map((schemaName) => ({
      icon: getSchemaIcon(schemaName),
      title: schemaName.charAt(0).toUpperCase() + schemaName.slice(1).replace(/([A-Z])/g, ' $1'),
      description: `Manage ${schemaName} content`,
      itemCount: 0, // Would need per-schema counts from API
      href: `/content-manager/${schemaName}`,
      iconBgColor: 'bg-gray-50',
      iconColor: 'text-gray-600',
    }))
  }, [schemas])

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
    <div className="flex-1 flex flex-col min-w-0 bg-white h-full relative">
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
                <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
                  Welcome back, {userName}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Here&apos;s what&apos;s happening in your project.
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <a href="https://magnet-cms.dev/docs" target="_blank" rel="noopener noreferrer">
                <Book className="w-4 h-4" />
                Documentation
              </a>
            </Button>
            <Button size="sm" onClick={() => navigate('/content-manager')}>
              <Plus className="w-4 h-4" />
              New Entry
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50/50 p-8">
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
              <h2 className="text-sm font-semibold text-gray-900">Collections</h2>
              <Link
                to="/content-manager"
                className="text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                View all
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
                <div className="col-span-full text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
                  <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-3">No collections yet</p>
                  <Button size="sm" variant="outline" onClick={() => navigate('/schema-builder')}>
                    <Plus className="w-4 h-4" />
                    Create your first schema
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
                    title="Create new type"
                    description="Add a new schema"
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

            <ActivityFeed
              activities={placeholderActivities}
              onViewAll={() => {
                // Would navigate to audit log when available
                console.log('View all activities')
              }}
            />
          </div>

          {/* Footer Links */}
          <div className="border-t border-gray-200 pt-8 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a
                href="https://magnet-cms.dev/docs/api"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-linear-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-md relative overflow-hidden group cursor-pointer block"
              >
                <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10">
                  <Code2 className="w-8 h-8 mb-4 text-gray-300" />
                  <h3 className="text-base font-semibold mb-2">API Documentation</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Learn how to consume your content via REST or GraphQL APIs.
                  </p>
                  <Badge className="text-xs font-medium bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-colors">
                    Read Docs
                  </Badge>
                </div>
              </a>

              <Link
                to="/users"
                className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-6 relative overflow-hidden group cursor-pointer hover:ring-blue-200 transition-all block"
              >
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="w-8 h-8 text-blue-600" />
                    <span className="text-gray-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                      →
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">Manage Team</h3>
                  <p className="text-sm text-gray-500">
                    Invite new members, manage roles and permissions for your project.
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
