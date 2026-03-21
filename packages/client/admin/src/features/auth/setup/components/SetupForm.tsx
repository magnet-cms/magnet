'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
	Button,
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@magnet-cms/ui'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useAppIntl } from '~/i18n'

const locales = [
	{ label: 'English', value: 'en' },
	{ label: 'Spanish', value: 'es' },
	{ label: 'French', value: 'fr' },
	{ label: 'German', value: 'de' },
	{ label: 'Italian', value: 'it' },
	{ label: 'Portuguese', value: 'pt' },
	{ label: 'Russian', value: 'ru' },
	{ label: 'Chinese', value: 'zh' },
	{ label: 'Japanese', value: 'ja' },
	{ label: 'Korean', value: 'ko' },
	{ label: 'Arabic', value: 'ar' },
] as const

const timezones = [
	{ label: 'UTC', value: 'utc' },
	{ label: 'Local', value: 'local' },
] as const

export interface SetupFormValues {
	siteName: string
	baseUrl: string
	defaultLocale: string
	timezone: string
}

interface SetupFormProps {
	onSubmit?: (data: SetupFormValues) => void
	onSkip?: () => void
	isLoading?: boolean
	defaultValues?: Partial<SetupFormValues>
}

export function SetupForm({
	onSubmit,
	onSkip,
	isLoading = false,
	defaultValues,
}: SetupFormProps) {
	const intl = useAppIntl()

	const setupSchema = useMemo(
		() =>
			z.object({
				siteName: z.string().min(
					1,
					intl.formatMessage({
						id: 'validation.siteNameRequired',
						defaultMessage: 'Site name is required',
					}),
				),
				baseUrl: z.string().optional().default(''),
				defaultLocale: z.string().min(1),
				timezone: z.string().min(1),
			}),
		[intl],
	)

	const form = useForm<SetupFormValues>({
		resolver: zodResolver(setupSchema),
		defaultValues: {
			siteName: defaultValues?.siteName ?? 'Magnet CMS',
			baseUrl: defaultValues?.baseUrl ?? '',
			defaultLocale: defaultValues?.defaultLocale ?? 'en',
			timezone: defaultValues?.timezone ?? 'utc',
		},
	})

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = form

	const defaultLocale = watch('defaultLocale')
	const timezone = watch('timezone')

	return (
		<form
			onSubmit={handleSubmit((data) => onSubmit?.(data))}
			className="flex w-full max-w-sm flex-col gap-8"
		>
			{/* Header */}
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					{intl.formatMessage({
						id: 'auth.setup.title',
						defaultMessage: 'Set up your project',
					})}
				</h1>
				<p className="text-muted-foreground text-sm">
					{intl.formatMessage({
						id: 'auth.setup.subtitle',
						defaultMessage:
							'Configure the basics for your Magnet CMS project. You can change these settings at any time.',
					})}
				</p>
			</div>

			{/* Form Fields */}
			<div className="flex flex-col gap-5">
				{/* Site Name */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="siteName" className="text-xs font-medium">
						{intl.formatMessage({
							id: 'auth.setup.siteNameLabel',
							defaultMessage: 'Site Name',
						})}
					</Label>
					<Input
						id="siteName"
						className="bg-muted/50"
						placeholder={intl.formatMessage({
							id: 'auth.setup.siteNamePlaceholder',
							defaultMessage: 'My Project',
						})}
						{...register('siteName')}
					/>
					{errors.siteName && (
						<p className="text-destructive text-xs">
							{errors.siteName.message}
						</p>
					)}
					<p className="text-muted-foreground text-xs">
						{intl.formatMessage({
							id: 'auth.setup.siteNameDescription',
							defaultMessage: 'The display name of your project.',
						})}
					</p>
				</div>

				{/* Base URL */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="baseUrl" className="text-xs font-medium">
						{intl.formatMessage({
							id: 'auth.setup.baseUrlLabel',
							defaultMessage: 'Base URL',
						})}
					</Label>
					<div className="flex overflow-hidden rounded-lg border border-border shadow-sm">
						<span className="inline-flex items-center border-r border-border bg-muted/50 px-3 text-sm text-muted-foreground">
							https://
						</span>
						<Input
							id="baseUrl"
							className="rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
							placeholder={intl.formatMessage({
								id: 'auth.setup.baseUrlPlaceholder',
								defaultMessage: 'api.myproject.com',
							})}
							{...register('baseUrl')}
						/>
					</div>
					<p className="text-muted-foreground text-xs">
						{intl.formatMessage({
							id: 'auth.setup.baseUrlDescription',
							defaultMessage: 'Primary URL for API responses and email links.',
						})}
					</p>
				</div>

				{/* Default Locale */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="defaultLocale" className="text-xs font-medium">
						{intl.formatMessage({
							id: 'auth.setup.localeLabel',
							defaultMessage: 'Default Language',
						})}
					</Label>
					<Select
						value={defaultLocale}
						onValueChange={(v) => setValue('defaultLocale', v)}
					>
						<SelectTrigger id="defaultLocale" className="bg-muted/50">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{locales.map((l) => (
								<SelectItem key={l.value} value={l.value}>
									{l.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Timezone */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="timezone" className="text-xs font-medium">
						{intl.formatMessage({
							id: 'auth.setup.timezoneLabel',
							defaultMessage: 'Timezone',
						})}
					</Label>
					<Select
						value={timezone}
						onValueChange={(v) => setValue('timezone', v)}
					>
						<SelectTrigger id="timezone" className="bg-muted/50">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{timezones.map((tz) => (
								<SelectItem key={tz.value} value={tz.value}>
									{tz.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<Button
					type="submit"
					size="lg"
					className="w-full gap-2"
					disabled={isLoading}
				>
					{isLoading
						? intl.formatMessage({
								id: 'auth.setup.saving',
								defaultMessage: 'Saving...',
							})
						: intl.formatMessage({
								id: 'auth.setup.saveChanges',
								defaultMessage: 'Save & Continue',
							})}
					{!isLoading && <ArrowRight className="size-3.5" />}
				</Button>
			</div>

			{/* Skip link */}
			<div className="flex justify-center">
				<button
					type="button"
					onClick={onSkip}
					className="text-muted-foreground hover:text-foreground text-xs transition-colors"
				>
					{intl.formatMessage({
						id: 'auth.setup.skip',
						defaultMessage: 'Skip for now',
					})}
				</button>
			</div>
		</form>
	)
}
