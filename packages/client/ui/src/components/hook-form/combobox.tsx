import { cn } from '@/lib/utils'
import { Check, ChevronsUpDown } from 'lucide-react'
import { ReactElement } from 'react'
import { useFormContext } from 'react-hook-form'
import { Button } from '../ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '../ui/command'
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'

type Option = { label: string; value: string }

type Props = {
	name: string
	label: string
	options: Option[]
	description?: ReactElement | string
}

export const RHFCombobox = ({ name, label, options, description }: Props) => {
	const { control, setValue } = useFormContext()

	return (
		<FormField
			name={name}
			control={control}
			render={({ field }) => (
				<FormItem className="flex flex-col">
					<FormLabel>{label}</FormLabel>
					<Popover>
						<PopoverTrigger asChild>
							<FormControl>
								<Button
									variant="outline"
									// biome-ignore lint/a11y/useSemanticElements: This is a combobox
									role="combobox"
									className={cn(
										'w-[200px] justify-between',
										!field.value && 'text-muted-foreground',
									)}
								>
									{field.value
										? options.find((opt) => opt.value === field.value)?.label
										: 'Select option'}
									<ChevronsUpDown className="opacity-50" />
								</Button>
							</FormControl>
						</PopoverTrigger>
						<PopoverContent className="w-[200px] p-0">
							<Command>
								<CommandInput placeholder="Search option..." className="h-9" />
								<CommandList>
									<CommandEmpty>No option found.</CommandEmpty>
									<CommandGroup>
										{options.map(({ label, value }) => (
											<CommandItem
												key={value}
												value={label}
												onSelect={() => setValue(name, value)}
											>
												{label}
												<Check
													className={cn(
														'ml-auto',
														value === field.value ? 'opacity-100' : 'opacity-0',
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
