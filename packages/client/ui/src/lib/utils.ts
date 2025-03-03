import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => {
	return twMerge(clsx(inputs))
}

export const capitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1)

export const names = (str: string) => {
	const camelSeparated = str.replace(/([a-z])([A-Z])/g, '$1-$2')

	const name = camelSeparated
		.replace(/[^a-zA-Z0-9]/g, '-')
		.replace(/--+/g, '-')
		.toLowerCase()

	const className = capitalize(name)
	const propertyName = name.replace(/-(\w)/g, (_, w) => w.toUpperCase())
	const constantName = name.toUpperCase().replace(/-/g, '_')
	const fileName = name

	const title = name
		.split('-')
		.map((word) => capitalize(word))
		.join(' ')

	const key = name.replace(/-/g, '_').toLowerCase()

	return { name, className, propertyName, constantName, fileName, title, key }
}
