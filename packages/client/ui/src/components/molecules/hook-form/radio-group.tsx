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
import { RadioGroup, RadioGroupItem } from '../../atoms/radio-group'

type Option = {
  label: ReactNode
  value: string
  description?: ReactNode
  disabled?: boolean
}

type Props = {
  name: string
  label: ReactNode
  options: Option[]
  description?: ReactNode
  formItemClassName?: string
  radioGroupClassName?: string
}

export const RHFRadioGroup = ({
  name,
  label,
  options,
  description,
  formItemClassName,
  radioGroupClassName,
}: Props) => {
  const { control } = useFormContext()

  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem className={formItemClassName ?? 'space-y-3'}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <RadioGroup
              onValueChange={field.onChange}
              value={field.value ?? undefined}
              className={radioGroupClassName ?? 'flex flex-col space-y-1'}
            >
              {options.map(
                ({
                  label: optionLabel,
                  value,
                  description: optionDescription,
                  disabled: optionDisabled,
                }) => (
                  <FormItem key={value} className="space-y-1">
                    <FormControl>
                      <div className="flex items-center space-x-3 space-y-0">
                        <RadioGroupItem value={value} disabled={optionDisabled} />
                        <FormLabel className="font-normal">{optionLabel}</FormLabel>
                      </div>
                    </FormControl>
                    {optionDescription && (
                      <FormDescription className="ml-6 text-xs text-muted-foreground">
                        {optionDescription}
                      </FormDescription>
                    )}
                  </FormItem>
                )
              )}
            </RadioGroup>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
