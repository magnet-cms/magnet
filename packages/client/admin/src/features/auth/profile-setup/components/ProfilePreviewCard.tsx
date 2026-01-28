import { Avatar, AvatarImage, AvatarFallback, Button } from '@magnet-cms/ui/components/atoms'
import { MapPin } from 'lucide-react'

interface ProfilePreviewCardProps {
  displayName: string
  username: string
  location?: string
  avatarUrl?: string
  coverUrl?: string
  stats?: {
    trips: number
    followers: number
    cities: number
  }
}

export function ProfilePreviewCard({
  displayName,
  username,
  location,
  avatarUrl,
  coverUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
  stats = { trips: 12, followers: 482, cities: 24 },
}: ProfilePreviewCardProps) {
  return (
    <div className="w-[360px] overflow-hidden rounded-2xl bg-white shadow-2xl">
      {/* Cover Image */}
      <div className="h-24 w-full overflow-hidden bg-muted">
        <img src={coverUrl} alt="Cover" className="size-full object-cover" />
      </div>

      {/* Profile Content */}
      <div className="-mt-10 flex flex-col gap-3 px-5 pb-6">
        {/* Avatar */}
        <Avatar className="size-20 border-4 border-white shadow-sm">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl} alt={displayName} />
          ) : (
            <AvatarFallback className="text-2xl">
              {displayName ? displayName.charAt(0).toUpperCase() : 'U'}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Name and Username */}
        <div className="flex flex-col gap-1 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold tracking-tight">{displayName || 'Your Name'}</h3>
              <span className="text-muted-foreground text-sm font-medium">
                @{username || 'username'}
              </span>
            </div>
            <Button variant="outline" size="sm" className="rounded-full px-3 text-xs">
              Edit
            </Button>
          </div>

          {/* Location */}
          {location && (
            <div className="flex items-center gap-1.5 pt-1">
              <MapPin className="text-muted-foreground size-3" />
              <span className="text-muted-foreground text-xs">{location}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-2 border-t border-border py-4">
          <StatItem value={stats.trips} label="Trips" />
          <StatItem value={stats.followers} label="Followers" hasBorder />
          <StatItem value={stats.cities} label="Cities" hasBorder />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6">
          <TabItem label="Overview" isActive />
          <TabItem label="Trips" />
          <TabItem label="Reviews" />
        </div>
      </div>
    </div>
  )
}

interface StatItemProps {
  value: number
  label: string
  hasBorder?: boolean
}

function StatItem({ value, label, hasBorder = false }: StatItemProps) {
  return (
    <div
      className={`flex flex-1 flex-col items-center ${hasBorder ? 'border-l border-border pl-2' : ''}`}
    >
      <span className="text-lg font-semibold tracking-tight">{value}</span>
      <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
        {label}
      </span>
    </div>
  )
}

interface TabItemProps {
  label: string
  isActive?: boolean
}

function TabItem({ label, isActive = false }: TabItemProps) {
  return (
    <button
      type="button"
      className={`border-b-2 pb-2.5 text-xs font-medium ${
        isActive ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'
      }`}
    >
      {label}
    </button>
  )
}
