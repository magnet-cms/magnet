'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { DefaultValues, FieldValues, SubmitHandler } from 'react-hook-form'
import { useForm, FormProvider as Form } from 'react-hook-form'
import type { ZodType } from 'zod'

import { cn } from '../../../lib/utils'
import { Button } from '../../atoms/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../atoms/sheet'

export interface FormDrawerProps<T extends FieldValues> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  submitLabel: string
  submitIcon?: LucideIcon
  onSubmit: SubmitHandler<T>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schema: ZodType<T, any, any>
  defaultValues: DefaultValues<T>
  isSubmitting?: boolean
  children: ReactNode
  side?: 'left' | 'right'
  className?: string
  contentClassName?: string
}

export function FormDrawer<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  submitIcon: SubmitIcon,
  onSubmit,
  schema,
  defaultValues,
  isSubmitting = false,
  children,
  side = 'right',
  className,
  contentClassName,
}: FormDrawerProps<T>) {
  const form = useForm<T>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues,
  })

  const handleSubmit: SubmitHandler<T> = async (data) => {
    await onSubmit(data)
    form.reset()
    onOpenChange(false)
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset()
    }
    onOpenChange(isOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side={side} className={cn('w-full sm:max-w-sm', className)}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-1 flex-col">
            <div className={cn('flex-1 space-y-5 px-5 py-6', contentClassName)}>{children}</div>

            <SheetFooter>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || form.formState.isSubmitting}>
                {SubmitIcon && <SubmitIcon className="mr-2 size-4" />}
                {submitLabel}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}
