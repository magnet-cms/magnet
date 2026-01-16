import { cn } from '@magnet-cms/ui/lib'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HEADER_STATUS_PORTAL_ID } from '~/layouts/DashboardLayout'
import type { PageHeaderStatusProps, StatusType } from './types'

const statusStyles: Record<StatusType, string> = {
	warning: 'text-amber-600 bg-amber-50 border-amber-200',
	success: 'text-emerald-600 bg-emerald-50 border-emerald-200',
	error: 'text-red-600 bg-red-50 border-red-200',
	info: 'text-blue-600 bg-blue-50 border-blue-200',
}

const dotStyles: Record<StatusType, string> = {
	warning: 'bg-amber-500',
	success: 'bg-emerald-500',
	error: 'bg-red-500',
	info: 'bg-blue-500',
}

export function PageHeaderStatus({ badges }: PageHeaderStatusProps) {
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
		null,
	)

	useEffect(() => {
		const container = document.getElementById(HEADER_STATUS_PORTAL_ID)
		setPortalContainer(container)

		return () => {
			if (container) {
				container.innerHTML = ''
			}
		}
	}, [])

	const badgeArray = Array.isArray(badges) ? badges : [badges]

	if (!portalContainer) return null

	return createPortal(
		<>
			{badgeArray.map((badge, i) => (
				<span
					key={`${badge.type}-${badge.label}-${i}`}
					className={cn(
						'flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border',
						statusStyles[badge.type],
					)}
				>
					{badge.dot && (
						<div
							className={cn('w-1 h-1 rounded-full', dotStyles[badge.type])}
						/>
					)}
					{badge.label}
				</span>
			))}
		</>,
		portalContainer,
	)
}
