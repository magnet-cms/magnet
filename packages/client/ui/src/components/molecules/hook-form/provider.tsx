'use client'

import type { FieldValues, SubmitHandler, UseFormReturn } from 'react-hook-form'
import { FormProvider as Form } from 'react-hook-form'

import { cn } from '../../../lib/utils'

type Props<T extends FieldValues> = {
  children: React.ReactNode
  onSubmit: SubmitHandler<T>
  className?: string
  id?: string
} & UseFormReturn<T>

export const FormProvider = <T extends FieldValues>({
  children,
  className,
  id,
  onSubmit,
  ...methods
}: Props<T>) => {
  return (
    <Form {...methods}>
      <form id={id} onSubmit={methods.handleSubmit(onSubmit)} className={cn(className)}>
        {children}
      </form>
    </Form>
  )
}
