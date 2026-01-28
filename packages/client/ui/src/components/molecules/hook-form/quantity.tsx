'use client'

import { Minus, Plus } from 'lucide-react'
import { type InputHTMLAttributes, type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

import { Button } from '../../atoms/button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../atoms/form'
import { Input } from '../../atoms/input'

type Props = {
  name: string
  label: ReactNode
  placeholder?: string
  description?: ReactNode
  disabled?: boolean
  required?: boolean
  min?: number
  max?: number
  step?: number
  formItemClassName?: string
  wrapperClassName?: string
  inputClassName?: string
  decrementButtonLabel?: string
  incrementButtonLabel?: string
  inputProps?: Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'type'
  >
}

export const RHFQuantity = ({
  name,
  label,
  placeholder,
  description,
  disabled,
  required,
  min = 0,
  max,
  step = 1,
  formItemClassName,
  wrapperClassName,
  inputClassName,
  decrementButtonLabel = 'Decrease',
  incrementButtonLabel = 'Increase',
  inputProps,
}: Props) => {
  const { control } = useFormContext()

  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => {
        const resolvedValue = Number(field.value)
        const currentValue = Number.isNaN(resolvedValue) ? min : resolvedValue

        const handleIncrement = () => {
          const newValue = currentValue + step
          if (!max || newValue <= max) {
            field.onChange(newValue)
          }
        }

        const handleDecrement = () => {
          const newValue = currentValue - step
          if (newValue >= min) {
            field.onChange(newValue)
          }
        }

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const value = e.target.value
          if (value === '') {
            field.onChange(min)
            return
          }

          const numValue = parseInt(value, 10)
          if (!isNaN(numValue)) {
            if (numValue >= min && (!max || numValue <= max)) {
              field.onChange(numValue)
            }
          }
        }

        return (
          <FormItem className={formItemClassName ?? 'gap-1'}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <div className={wrapperClassName ?? 'flex items-center space-x-2'}>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleDecrement}
                  disabled={disabled || currentValue <= min}
                  aria-label={decrementButtonLabel}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  placeholder={placeholder}
                  disabled={disabled}
                  required={required}
                  min={min}
                  max={max}
                  step={step}
                  value={currentValue}
                  onChange={handleInputChange}
                  className={inputClassName ?? 'text-center'}
                  {...inputProps}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={handleIncrement}
                  disabled={disabled || (max !== undefined && currentValue >= max)}
                  aria-label={incrementButtonLabel}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        )
      }}
    />
  )
}
