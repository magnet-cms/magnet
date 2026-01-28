import { Avatar, AvatarImage, AvatarFallback } from '@magnet-cms/ui/components/atoms'
import { Coffee, Landmark, MapPin, Plus } from 'lucide-react'

interface TripActivity {
  time: string
  title: string
  subtitle: string
  icon: 'coffee' | 'landmark'
  avatars?: string[]
  othersCount?: number
}

interface TripPreviewCardProps {
  title: string
  destinations: string[]
  isActive?: boolean
  activities: TripActivity[]
  totalBudget: string
}

export function TripPreviewCard({
  title,
  destinations,
  isActive = true,
  activities,
  totalBudget,
}: TripPreviewCardProps) {
  return (
    <div className="w-[380px] overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg">
            <MapPin className="size-[18px] text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white">{title}</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/60">
              {destinations.join(' • ')}
            </span>
          </div>
        </div>
        {isActive && (
          <span className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
            Active
          </span>
        )}
      </div>

      {/* Activities */}
      <div className="mt-6 flex flex-col gap-3">
        {activities.map((activity, index) => (
          <ActivityCard key={index} activity={activity} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-normal uppercase tracking-wider text-white/40">
            Total Budget
          </span>
          <span className="text-sm font-semibold text-white">{totalBudget}</span>
        </div>
        <button className="flex size-8 items-center justify-center rounded-full bg-white transition-transform hover:scale-105">
          <Plus className="size-4 text-zinc-900" />
        </button>
      </div>
    </div>
  )
}

interface ActivityCardProps {
  activity: TripActivity
}

function ActivityCard({ activity }: ActivityCardProps) {
  const Icon = activity.icon === 'coffee' ? Coffee : Landmark

  return (
    <div className="flex gap-3 rounded-lg border border-white/5 bg-white/5 p-3">
      {/* Time Column */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <span className="text-[10px] font-medium text-white/50">{activity.time}</span>
        <div className="h-8 w-px bg-white/10" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-xs font-medium text-white/90">{activity.title}</span>
        <span className="text-[10px] text-white/50">{activity.subtitle}</span>

        {activity.avatars && activity.avatars.length > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {activity.avatars.map((avatar, index) => (
                <Avatar key={index} className="size-4 ring-1 ring-black">
                  <AvatarImage src={avatar} />
                  <AvatarFallback className="text-[8px]">U</AvatarFallback>
                </Avatar>
              ))}
            </div>
            {activity.othersCount && activity.othersCount > 0 && (
              <span className="text-[9px] text-white/40">+{activity.othersCount} others</span>
            )}
          </div>
        )}
      </div>

      {/* Icon */}
      <div className="pt-0.5">
        <Icon className="size-3.5 text-white/50" />
      </div>
    </div>
  )
}
