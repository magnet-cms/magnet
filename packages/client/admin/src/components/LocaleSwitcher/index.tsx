import {
	Badge,
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@magnet-cms/ui/components'
import { Check, ChevronDown, Globe, Plus } from 'lucide-react'
import type { LocaleStatus } from '~/core/adapters/types'

export interface LocaleOption {
	code: string
	name: string
}

interface LocaleSwitcherProps {
	currentLocale: string
	locales: LocaleOption[]
	localeStatuses?: Record<string, LocaleStatus>
	onLocaleChange: (locale: string) => void
	onAddLocale?: (locale: string) => void
	disabled?: boolean
}

export const LocaleSwitcher = ({
	currentLocale,
	locales,
	localeStatuses,
	onLocaleChange,
	onAddLocale,
	disabled,
}: LocaleSwitcherProps) => {
	const currentLocaleName =
		locales.find((l) => l.code === currentLocale)?.name || currentLocale

	// Get available locales (ones that have content)
	const availableLocales = locales.filter(
		(l) =>
			localeStatuses?.[l.code]?.hasDraft ||
			localeStatuses?.[l.code]?.hasPublished,
	)

	// Get missing locales (ones that can be added)
	const missingLocales = locales.filter(
		(l) =>
			!localeStatuses?.[l.code]?.hasDraft &&
			!localeStatuses?.[l.code]?.hasPublished,
	)

	const getStatusBadge = (locale: string) => {
		const status = localeStatuses?.[locale]
		if (!status) return null

		if (status.hasPublished && status.hasDraft) {
			return (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge variant="default" className="ml-2 text-xs">
								Published
							</Badge>
						</TooltipTrigger>
						<TooltipContent>
							<p>Has both draft and published versions</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)
		}

		if (status.hasPublished) {
			return (
				<Badge variant="default" className="ml-2 text-xs">
					Published
				</Badge>
			)
		}

		if (status.hasDraft) {
			return (
				<Badge variant="secondary" className="ml-2 text-xs">
					Draft
				</Badge>
			)
		}

		return null
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" disabled={disabled} className="gap-2">
					<Globe className="h-4 w-4" />
					{currentLocaleName}
					{getStatusBadge(currentLocale)}
					<ChevronDown className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-56">
				{availableLocales.length > 0 && (
					<>
						{availableLocales.map((locale) => (
							<DropdownMenuItem
								key={locale.code}
								onClick={() => onLocaleChange(locale.code)}
								className="flex items-center justify-between"
							>
								<span className="flex items-center gap-2">
									{locale.code === currentLocale && (
										<Check className="h-4 w-4" />
									)}
									{locale.code !== currentLocale && <span className="w-4" />}
									{locale.name}
								</span>
								{getStatusBadge(locale.code)}
							</DropdownMenuItem>
						))}
					</>
				)}

				{missingLocales.length > 0 && onAddLocale && (
					<>
						{availableLocales.length > 0 && <DropdownMenuSeparator />}
						<div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
							Add Translation
						</div>
						{missingLocales.map((locale) => (
							<DropdownMenuItem
								key={locale.code}
								onClick={() => onAddLocale(locale.code)}
								className="flex items-center gap-2"
							>
								<Plus className="h-4 w-4" />
								{locale.name}
							</DropdownMenuItem>
						))}
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
