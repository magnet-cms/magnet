'use client'

import { type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../atoms/form'
import { Switch } from '../../atoms/switch'

type Props = {
  name: string
  label: string
  description?: ReactNode
  disabled?: boolean
  formItemClassName?: string
  switchProps?: React.ComponentProps<typeof Switch>
}

export const RHFSwitch = ({
  name,
  label,
  description,
  disabled,
  formItemClassName,
  switchProps,
}: Props) => {
  const { control } = useFormContext()

  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem
          className={
            formItemClassName ??
            'flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm'
          }
        >
          <div className="space-y-0.5">
            <FormLabel>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch
              checked={Boolean(field.value)}
              onCheckedChange={(checked) => field.onChange(Boolean(checked))}
              disabled={disabled}
              {...switchProps}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
