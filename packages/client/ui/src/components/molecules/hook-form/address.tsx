'use client'

import { type ReactNode } from 'react'
import GooglePlacesAutocomplete from 'react-google-places-autocomplete'
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

type Props = {
  addressName: string
  complementName: string
  label: string
  description?: ReactNode
  placeholder?: string
  disabled?: boolean
  required?: boolean
  formItemClassName?: string
  inputClassName?: string
  defaultCountry?: string
  apiKey?: string
  onAddressSelect?: (address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }) => void
}

export const RHFAddress = ({
  addressName,
  complementName,
  label,
  description,
  placeholder = 'Enter your address',
  disabled,
  required,
  formItemClassName,
  inputClassName,
  defaultCountry = 'BR',
  apiKey,
  onAddressSelect,
}: Props) => {
  const { control, setValue } = useFormContext()

  // Get API key from environment or prop
  const getApiKey = () => {
    if (apiKey) return apiKey
    if (typeof window !== 'undefined') {
      return process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || ''
    }
    return ''
  }

  const googleApiKey = getApiKey()

  return (
    <>
      <FormField
        name={addressName}
        control={control}
        render={({ field }) => {
          return (
            <FormItem className={cn('gap-2', formItemClassName)}>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                {googleApiKey ? (
                  <div className="[&_.pac-container]:bg-popover [&_.pac-container]:border-border [&_.pac-container]:text-popover-foreground [&_.pac-item]:text-foreground [&_.pac-item:hover]:bg-accent [&_.pac-item-selected]:bg-accent">
                    <GooglePlacesAutocomplete
                      apiKey={googleApiKey}
                      selectProps={{
                        value: field.value
                          ? {
                              label:
                                typeof field.value === 'string' ? field.value : field.value.label,
                              value:
                                typeof field.value === 'string' ? field.value : field.value.value,
                            }
                          : null,
                        onChange: async (
                          place: { label: string; value: { place_id: string } } | null
                        ) => {
                          if (!place) {
                            field.onChange('')
                            return
                          }

                          const addressString = place.label
                          field.onChange(addressString)

                          // Parse address details from the place
                          try {
                            // Import dynamically to avoid SSR issues
                            const { geocodeByPlaceId } =
                              await import('react-google-places-autocomplete')

                            const results = await geocodeByPlaceId(place.value.place_id)
                            if (results && results.length > 0 && results[0]) {
                              const addressComponents = results[0].address_components
                              const addressDetails: {
                                street: string
                                city: string
                                state: string
                                postalCode: string
                                country: string
                              } = {
                                street: '',
                                city: '',
                                state: '',
                                postalCode: '',
                                country: defaultCountry,
                              }

                              // Parse address components
                              if (addressComponents) {
                                addressComponents.forEach((component) => {
                                  const types = component.types

                                  if (types.includes('street_number')) {
                                    addressDetails.street = component.long_name + ' '
                                  } else if (types.includes('route')) {
                                    addressDetails.street += component.long_name
                                  } else if (
                                    types.includes('locality') ||
                                    types.includes('administrative_area_level_2')
                                  ) {
                                    addressDetails.city = component.long_name
                                  } else if (
                                    types.includes('administrative_area_level_1') ||
                                    types.includes('administrative_area_level_2')
                                  ) {
                                    addressDetails.state =
                                      component.short_name || component.long_name
                                  } else if (types.includes('postal_code')) {
                                    addressDetails.postalCode = component.long_name
                                  } else if (types.includes('country')) {
                                    addressDetails.country = component.short_name
                                  }
                                })
                              }

                              // If street is empty, use formatted address
                              if (!addressDetails.street && results[0]?.formatted_address) {
                                const parts = results[0].formatted_address.split(',')
                                addressDetails.street = parts[0] || addressString
                              }

                              // Update form fields
                              setValue('street', addressDetails.street.trim(), {
                                shouldValidate: false,
                              })
                              setValue('city', addressDetails.city, { shouldValidate: false })
                              setValue('state', addressDetails.state, { shouldValidate: false })
                              setValue('postalCode', addressDetails.postalCode, {
                                shouldValidate: false,
                              })
                              setValue('country', addressDetails.country, { shouldValidate: false })

                              // Call callback if provided
                              onAddressSelect?.(addressDetails)
                            }
                          } catch (error) {
                            console.error('Error parsing address:', error)
                          }
                        },
                        placeholder,
                        isDisabled: disabled,
                        className: cn(
                          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                          inputClassName
                        ),
                        styles: {
                          control: (provided: Record<string, unknown>) => ({
                            ...provided,
                            border: 'none',
                            boxShadow: 'none',
                            backgroundColor: 'transparent',
                          }),
                          input: (provided: Record<string, unknown>) => ({
                            ...provided,
                            color: 'inherit',
                          }),
                          placeholder: (provided: Record<string, unknown>) => ({
                            ...provided,
                            color: 'inherit',
                            opacity: 0.5,
                          }),
                        },
                      }}
                      autocompletionRequest={{
                        componentRestrictions: { country: defaultCountry.toLowerCase() },
                      }}
                    />
                  </div>
                ) : (
                  <Input
                    id={field.name}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    value={field.value ?? ''}
                    onChange={(event) => {
                      field.onChange(event.target.value)
                    }}
                    onBlur={field.onBlur}
                    className={inputClassName}
                  />
                )}
              </FormControl>
              {description && <FormDescription>{description}</FormDescription>}
              <FormMessage />
            </FormItem>
          )
        }}
      />

      <FormField
        name={complementName}
        control={control}
        render={({ field }) => {
          return (
            <FormItem className={cn('gap-2', formItemClassName)}>
              <FormLabel>Address Complement</FormLabel>
              <FormControl>
                <Input
                  id={field.name}
                  placeholder="Apartment, suite, floor, etc. (optional)"
                  disabled={disabled}
                  value={field.value ?? ''}
                  onChange={(event) => {
                    field.onChange(event.target.value)
                  }}
                  onBlur={field.onBlur}
                  className={inputClassName}
                />
              </FormControl>
              <FormDescription>Additional address information (optional)</FormDescription>
              <FormMessage />
            </FormItem>
          )
        }}
      />
    </>
  )
}
