'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Separator } from '@magnet-cms/ui/components/atoms'
import { FormProvider, RHFText } from '@magnet-cms/ui/components/molecules/hook-form'
import { ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

type SignupFormValues = z.infer<typeof signupSchema>

interface SignupFormProps {
  onSubmit?: (data: SignupFormValues) => void
  isLoading?: boolean
}

export function SignupForm({ onSubmit, isLoading = false }: SignupFormProps) {
  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  })

  const handleSubmit = (data: SignupFormValues) => {
    onSubmit?.(data)
  }

  return (
    <FormProvider {...form} onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-muted-foreground text-sm">
          Start planning your next adventure together.
        </p>
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <RHFText
            name="firstName"
            label="First name"
            placeholder="Jane"
            inputClassName="bg-muted/50"
            formItemClassName="flex-1"
            autoComplete="given-name"
          />

          <RHFText
            name="lastName"
            label="Last name"
            placeholder="Doe"
            inputClassName="bg-muted/50"
            formItemClassName="flex-1"
            autoComplete="family-name"
          />
        </div>

        <RHFText
          name="email"
          label="Email"
          type="email"
          placeholder="jane@example.com"
          inputClassName="bg-muted/50"
          autoComplete="email"
        />

        <RHFText
          name="password"
          label="Password"
          type="password"
          inputClassName="bg-muted/50"
          autoComplete="new-password"
          description="Must be at least 8 characters with uppercase, lowercase, and number."
        />

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Get started'}
          {!isLoading && <ArrowRight className="size-3.5" />}
        </Button>
      </div>

      {/* Divider */}
      <div className="relative">
        <Separator />
        <span className="bg-background text-muted-foreground absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs font-medium">
          Or continue with
        </span>
      </div>

      {/* Social Login */}
      <Button type="button" variant="outline" className="w-full gap-2" disabled={isLoading}>
        <GoogleIcon className="size-4" />
        Google
      </Button>
    </FormProvider>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
