'use client'

import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'
import { useFormContext } from 'react-hook-form'

import { Button } from '../../atoms/button'
import { Calendar } from '../../atoms/calendar'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../atoms/form'
import { Popover, PopoverContent, PopoverTrigger } from '../../atoms/popover'
import { cn } from '../../../lib/utils'

type Props = {
  name: string
  label: ReactNode
  description?: ReactNode
  placeholder?: string
  disabled?: boolean
  formItemClassName?: string
  buttonClassName?: string
  disableDate?: (date: Date) => boolean
  minDate?: Date
  maxDate?: Date
}

export const RHFDatePicker = ({
  name,
  label,
  description,
  placeholder = 'Pick a date',
  disabled,
  formItemClassName,
  buttonClassName,
  disableDate,
  minDate,
  maxDate,
}: Props) => {
  const { control } = useFormContext()

  const mergedDisable = useMemo(() => {
    return (date: Date) => {
      if (disabled) {
        return true
      }

      // Compare dates at midnight for accurate date-only comparison
      const dateAtMidnight = new Date(date)
      dateAtMidnight.setHours(0, 0, 0, 0)

      if (minDate) {
        const minDateAtMidnight = new Date(minDate)
        minDateAtMidnight.setHours(0, 0, 0, 0)
        if (dateAtMidnight < minDateAtMidnight) {
          return true
        }
      }

      if (maxDate) {
        const maxDateAtMidnight = new Date(maxDate)
        maxDateAtMidnight.setHours(0, 0, 0, 0)
        if (dateAtMidnight > maxDateAtMidnight) {
          return true
        }
      }

      if (disableDate) {
        return disableDate(date)
      }

      return false
    }
  }, [disabled, disableDate, minDate, maxDate])

  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem className={formItemClassName ?? 'gap-1'}>
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full pl-3 text-left font-normal',
                    !field.value && 'text-muted-foreground',
                    buttonClassName
                  )}
                  disabled={disabled}
                >
                  {field.value ? format(field.value, 'PPP') : <span>{placeholder}</span>}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                disabled={mergedDisable}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
