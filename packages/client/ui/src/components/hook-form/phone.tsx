'use client'

import { type ReactNode, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import PhoneInput, {
	type Country,
	type Value,
	getCountries,
	getCountryCallingCode,
} from 'react-phone-number-input'

import 'react-phone-number-input/style.css'

import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib'

type Props = {
	name: string
	label: string
	description?: ReactNode
	placeholder?: string
	disabled?: boolean
	required?: boolean
	formItemClassName?: string
	inputClassName?: string
	defaultCountry?: Country
	international?: boolean
	countryCallingCodeEditable?: boolean
}

// Helper function to get country flag emoji
function getCountryFlag(country: Country): string {
	const codePoints = country
		.toUpperCase()
		.split('')
		.map((char) => 127397 + char.charCodeAt(0))
	return String.fromCodePoint(...codePoints)
}

// Custom Country Select component using shadcn Select
type CountrySelectProps = {
	value?: Country
	onChange: (value: Country | undefined) => void
	options?: unknown
	disabled?: boolean
}

function CountrySelect({ value, onChange, ...rest }: CountrySelectProps) {
	const countries = getCountries()
	const [open, setOpen] = useState(false)

	return (
		<Select
			value={value}
			onValueChange={(newValue) => {
				onChange(newValue as Country | undefined)
			}}
			open={open}
			onOpenChange={setOpen}
			disabled={rest.disabled}
		>
			<SelectTrigger className="h-10 w-[140px] border-r rounded-r-none rounded-l-md">
				<SelectValue>
					{value ? (
						<div className="flex items-center gap-2">
							<span className="text-lg">{getCountryFlag(value)}</span>
							<span className="text-sm">+{getCountryCallingCode(value)}</span>
						</div>
					) : (
						<span className="text-muted-foreground">Select</span>
					)}
				</SelectValue>
			</SelectTrigger>
			<SelectContent className="max-h-[300px]">
				{countries.map((country) => (
					<SelectItem key={country} value={country}>
						<div className="flex items-center gap-2">
							<span className="text-lg">{getCountryFlag(country)}</span>
							<span className="text-sm">+{getCountryCallingCode(country)}</span>
						</div>
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	)
}

export const RHFPhone = ({
	name,
	label,
	description,
	placeholder,
	disabled,
	required,
	formItemClassName,
	inputClassName,
	defaultCountry = 'BR',
	countryCallingCodeEditable = false,
}: Props) => {
	const { control } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => {
				return (
					<FormItem className={cn('gap-2', formItemClassName)}>
						<FormLabel>{label}</FormLabel>
						<FormControl>
							<div className="flex h-10 w-full rounded-md border border-input bg-background text-sm ring-offset-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
								<PhoneInput
									international={false}
									defaultCountry={defaultCountry}
									countryCallingCodeEditable={countryCallingCodeEditable}
									value={field.value as Value}
									onChange={(value) => {
										field.onChange(value || '')
									}}
									onBlur={field.onBlur}
									disabled={disabled}
									placeholder={placeholder}
									countrySelectComponent={CountrySelect}
									className="flex-1"
									numberInputProps={{
										className: cn(
											'flex h-full w-full rounded-md border-0 bg-transparent px-3 py-0 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
											inputClassName,
										),
										required,
									}}
								/>
							</div>
						</FormControl>
						<FormDescription>{description}</FormDescription>
						<FormMessage />
					</FormItem>
				)
			}}
		/>
	)
}
