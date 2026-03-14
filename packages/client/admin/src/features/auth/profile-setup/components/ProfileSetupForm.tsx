'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@magnet-cms/ui/components/atoms'
import {
	FormProvider,
	RHFText,
} from '@magnet-cms/ui/components/molecules/hook-form'
import { ArrowRight, MapPin } from 'lucide-react'
import { useEffect } from 'react'
import { useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useAppIntl } from '~/i18n'

interface ProfileSetupFormValues {
	displayName: string
	username: string
	location?: string
}

interface ProfileSetupFormProps {
	onSubmit?: (data: ProfileSetupFormValues) => void
	onChange?: (data: ProfileSetupFormValues) => void
	isLoading?: boolean
	defaultValues?: Partial<ProfileSetupFormValues>
}

export function ProfileSetupForm({
	onSubmit,
	onChange,
	isLoading = false,
	defaultValues,
}: ProfileSetupFormProps) {
	const intl = useAppIntl()
	const profileSetupSchema = useMemo(
		() =>
			z.object({
				displayName: z
					.string()
					.min(
						1,
						intl.formatMessage({
							id: 'validation.displayNameRequired',
							defaultMessage: 'Display name is required',
						}),
					)
					.max(
						50,
						intl.formatMessage({
							id: 'validation.displayNameTooLong',
							defaultMessage: 'Display name is too long',
						}),
					),
				username: z
					.string()
					.min(
						3,
						intl.formatMessage({
							id: 'validation.usernameMin3',
							defaultMessage: 'Username must be at least 3 characters',
						}),
					)
					.max(
						30,
						intl.formatMessage({
							id: 'validation.usernameTooLong',
							defaultMessage: 'Username is too long',
						}),
					)
					.regex(
						/^[a-zA-Z0-9_]+$/,
						intl.formatMessage({
							id: 'validation.usernameFormat',
							defaultMessage:
								'Username can only contain letters, numbers, and underscores',
						}),
					),
				location: z.string().optional(),
			}),
		[intl],
	)
	const form = useForm<ProfileSetupFormValues>({
		resolver: zodResolver(profileSetupSchema),
		defaultValues: {
			displayName: defaultValues?.displayName ?? '',
			username: defaultValues?.username ?? '',
			location: defaultValues?.location ?? '',
		},
	})

	const handleSubmit = (data: ProfileSetupFormValues) => {
		onSubmit?.(data)
	}

	// Watch for changes to trigger preview updates
	const watchedValues = useWatch({ control: form.control })

	useEffect(() => {
		if (onChange && Object.keys(form.formState.errors).length === 0) {
			onChange({
				displayName: watchedValues.displayName ?? '',
				username: watchedValues.username ?? '',
				location: watchedValues.location,
			})
		}
	}, [watchedValues, onChange, form.formState.errors])

	return (
		<FormProvider
			{...form}
			onSubmit={handleSubmit}
			className="flex w-full max-w-sm flex-col gap-8"
		>
			{/* Header */}
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					{intl.formatMessage({
						id: 'auth.profileSetup.title',
						defaultMessage: 'Identity & Basics',
					})}
				</h1>
				<p className="text-muted-foreground text-sm">
					{intl.formatMessage({
						id: 'auth.profileSetup.subtitle',
						defaultMessage:
							"Let's set up your public profile. This is how you will appear to other travelers on Magnet.",
					})}
				</p>
			</div>

			{/* Form Fields */}
			<div className="flex flex-col gap-5">
				<RHFText
					name="displayName"
					label={intl.formatMessage({
						id: 'auth.profileSetup.displayNameLabel',
						defaultMessage: 'Display Name',
					})}
					placeholder={intl.formatMessage({
						id: 'auth.profileSetup.displayNamePlaceholder',
						defaultMessage: 'Maria',
					})}
					inputClassName="bg-muted/50"
					description={intl.formatMessage({
						id: 'auth.profileSetup.displayNameDescription',
						defaultMessage:
							'This will be your visible name on trips and reviews.',
					})}
				/>

				<RHFText
					name="username"
					label={intl.formatMessage({
						id: 'auth.profileSetup.usernameLabel',
						defaultMessage: 'Username',
					})}
					placeholder={intl.formatMessage({
						id: 'auth.profileSetup.usernamePlaceholder',
						defaultMessage: 'maria',
					})}
					inputClassName="bg-muted/50 pl-8"
					prefix={<span className="text-sm font-medium">@</span>}
					description={intl.formatMessage({
						id: 'auth.profileSetup.usernameDescription',
						defaultMessage: 'Unique handle for your profile URL.',
					})}
				/>

				<RHFText
					name="location"
					label={intl.formatMessage({
						id: 'auth.profileSetup.locationLabel',
						defaultMessage: 'Location',
					})}
					placeholder={intl.formatMessage({
						id: 'auth.profileSetup.locationPlaceholder',
						defaultMessage: 'Lisbon, Portugal',
					})}
					inputClassName="bg-muted/50 pl-9"
					prefix={<MapPin className="size-3.5" />}
				/>

				<Button
					type="submit"
					size="lg"
					className="w-full gap-2"
					disabled={isLoading}
				>
					{isLoading
						? intl.formatMessage({
								id: 'auth.profileSetup.saving',
								defaultMessage: 'Saving...',
							})
						: intl.formatMessage({
								id: 'auth.profileSetup.continue',
								defaultMessage: 'Continue',
							})}
					{!isLoading && <ArrowRight className="size-3.5" />}
				</Button>
			</div>

			{/* Footer */}
			<p className="text-muted-foreground text-[10px]">
				{intl.formatMessage({
					id: 'auth.profileSetup.requiredFields',
					defaultMessage: 'Fields marked with an asterisk are required',
				})}
			</p>
		</FormProvider>
	)
}
