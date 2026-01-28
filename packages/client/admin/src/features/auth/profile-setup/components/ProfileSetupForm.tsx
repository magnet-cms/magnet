'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@magnet-cms/ui/components/atoms'
import { FormProvider, RHFText } from '@magnet-cms/ui/components/molecules/hook-form'
import { ArrowRight, MapPin } from 'lucide-react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

const profileSetupSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50, 'Display name is too long'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username is too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  location: z.string().optional(),
})

type ProfileSetupFormValues = z.infer<typeof profileSetupSchema>

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
    <FormProvider {...form} onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Identity &amp; Basics</h1>
        <p className="text-muted-foreground text-sm">
          Let&apos;s set up your public profile. This is how you will appear to other travelers on
          Magnet.
        </p>
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-5">
        <RHFText
          name="displayName"
          label="Display Name"
          placeholder="Maria"
          inputClassName="bg-muted/50"
          description="This will be your visible name on trips and reviews."
        />

        <RHFText
          name="username"
          label="Username"
          placeholder="maria"
          inputClassName="bg-muted/50 pl-8"
          prefix={<span className="text-sm font-medium">@</span>}
          description="Unique handle for your profile URL."
        />

        <RHFText
          name="location"
          label="Location"
          placeholder="Lisbon, Portugal"
          inputClassName="bg-muted/50 pl-9"
          prefix={<MapPin className="size-3.5" />}
        />

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Continue'}
          {!isLoading && <ArrowRight className="size-3.5" />}
        </Button>
      </div>

      {/* Footer */}
      <p className="text-muted-foreground text-[10px]">
        Fields marked with an asterisk are required
      </p>
    </FormProvider>
  )
}
