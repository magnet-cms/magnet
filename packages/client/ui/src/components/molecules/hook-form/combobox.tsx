'use client'

import { Check, ChevronsUpDown } from 'lucide-react'
import { type ReactNode } from 'react'
import { useFormContext } from 'react-hook-form'

import { Button } from '../../atoms/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../atoms/command'
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

type Option = { label: ReactNode; value: string }

type Props = {
  name: string
  label: string
  options: Option[]
  description?: ReactNode
  placeholder?: string
  emptyState?: ReactNode
  searchPlaceholder?: string
  disabled?: boolean
  formItemClassName?: string
  buttonClassName?: string
  onValueChange?: (value: string) => void
}

export const RHFCombobox = ({
  name,
  label,
  options,
  description,
  placeholder = 'Select option',
  emptyState = 'No option found.',
  searchPlaceholder = 'Search option...',
  disabled,
  formItemClassName,
  buttonClassName,
  onValueChange,
}: Props) => {
  const { control } = useFormContext()

  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem className={formItemClassName ?? 'flex flex-col'}>
          <FormLabel>{label}</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  // biome-ignore lint/a11y/useSemanticElements: This is a combobox
                  role="combobox"
                  disabled={disabled}
                  className={cn(
                    'w-full justify-between',
                    !field.value && 'text-muted-foreground',
                    buttonClassName
                  )}
                >
                  {field.value
                    ? options.find((opt) => opt.value === field.value)?.label
                    : placeholder}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder={searchPlaceholder} className="h-9" />
                <CommandList>
                  <CommandEmpty>{emptyState}</CommandEmpty>
                  <CommandGroup>
                    {options.map(({ label, value }) => (
                      <CommandItem
                        key={value}
                        value={typeof label === 'string' ? label : value}
                        onSelect={() => {
                          field.onChange(value)
                          onValueChange?.(value)
                        }}
                      >
                        {label}
                        <Check
                          className={cn(
                            'ml-auto',
                            value === field.value ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
