'use client'

import { type InputHTMLAttributes, type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../atoms/form'
import { Input } from '../../atoms/input'
import { cn } from '../../../lib/utils'

type InputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'name' | 'value' | 'defaultValue' | 'prefix' | 'suffix'
>

type Props = InputProps & {
  name: string
  label: string
  description?: ReactNode
  formItemClassName?: string
  inputClassName?: string
  prefix?: ReactNode
  suffix?: ReactNode
}

export const RHFText = ({
  name,
  label,
  placeholder,
  description,
  type,
  disabled,
  required,
  formItemClassName,
  inputClassName,
  prefix,
  suffix,
  min,
  max,
  step,
  onChange,
  onBlur,
  inputMode,
  autoComplete,
  ...rest
}: Props) => {
  const { control } = useFormContext()

  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => {
        const { className: restClassName, ...inputProps } = rest

        const hasPrefixOrSuffix = prefix || suffix

        return (
          <FormItem className={cn('gap-2', formItemClassName)}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              {hasPrefixOrSuffix ? (
                <div className="relative">
                  {prefix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center text-muted-foreground pointer-events-none">
                      {prefix}
                    </span>
                  )}
                  <Input
                    id={field.name}
                    type={type}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    value={field.value ?? ''}
                    onChange={(event) => {
                      if (type === 'number') {
                        const value = event.target.value
                        const numericValue = value === '' ? undefined : Number(value)
                        field.onChange(numericValue)
                      } else {
                        field.onChange(event.target.value)
                      }
                      onChange?.(event)
                    }}
                    onBlur={(event) => {
                      field.onBlur()
                      onBlur?.(event)
                    }}
                    inputMode={inputMode}
                    autoComplete={autoComplete}
                    min={min}
                    max={max}
                    step={step}
                    className={cn(
                      prefix && 'pl-10',
                      suffix && 'pr-10',
                      inputClassName ?? restClassName
                    )}
                    {...inputProps}
                  />
                  {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center text-muted-foreground pointer-events-none">
                      {suffix}
                    </span>
                  )}
                </div>
              ) : (
                <Input
                  id={field.name}
                  type={type}
                  placeholder={placeholder}
                  disabled={disabled}
                  required={required}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    if (type === 'number') {
                      const value = event.target.value
                      const numericValue = value === '' ? undefined : Number(value)
                      field.onChange(numericValue)
                    } else {
                      field.onChange(event.target.value)
                    }
                    onChange?.(event)
                  }}
                  onBlur={(event) => {
                    field.onBlur()
                    onBlur?.(event)
                  }}
                  inputMode={inputMode}
                  autoComplete={autoComplete}
                  min={min}
                  max={max}
                  step={step}
                  className={inputClassName ?? restClassName}
                  {...inputProps}
                />
              )}
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
