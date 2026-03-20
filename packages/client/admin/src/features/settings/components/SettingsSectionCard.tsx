'use client'

import { Card, CardContent } from '@magnet-cms/ui'
import { cn } from '@magnet-cms/ui/lib/utils'
import type { ReactElement } from 'react'
import type { SettingsSection } from '../types'
import { getIconComponent } from '../utils/iconMap'
import { SettingsFieldRenderer } from './SettingsFieldRenderer'

interface SettingsSectionCardProps {
	/** The section to render */
	section: SettingsSection
	/** Whether the form is disabled (e.g., during save) */
	disabled?: boolean
}

/**
 * Renders a settings section as a Card with header and fields.
 * Supports different visual variants (default, danger).
 */
export function SettingsSectionCard({
	section,
	disabled,
}: SettingsSectionCardProps): ReactElement {
	const IconComponent = getIconComponent(section.icon)
	const isDanger = section.variant === 'danger'

	return (
		<Card
			className={cn(
				'overflow-hidden',
				isDanger && 'border-destructive/40 bg-destructive/5',
			)}
		>
			{/* Section Header */}
			<div
				className={cn(
					'px-6 py-4 border-b border-border flex items-center gap-2',
					isDanger && 'border-destructive/30',
				)}
			>
				{isDanger ? (
					<span className="text-red-500 font-bold">!</span>
				) : (
					IconComponent && (
						<IconComponent className="w-[18px] h-[18px] text-gray-400" />
					)
				)}
				<h2
					className={cn(
						'text-sm font-semibold',
						isDanger ? 'text-red-900' : 'text-gray-900',
					)}
				>
					{section.label}
				</h2>
			</div>

			{/* Section Content */}
			<CardContent className="px-6 pb-6">
				{section.description && (
					<p className="text-xs text-gray-500 mb-6">{section.description}</p>
				)}

				<div className="space-y-5">
					{section.fields.map((field) => (
						<SettingsFieldRenderer
							key={field.name}
							field={field}
							disabled={disabled}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
