import { SchemaMetadata, SchemaProperty, UISelect } from '@magnet-cms/common'
import { ZodObject, ZodType, z } from 'zod'

export const buildFormSchema = (
	schema: SchemaMetadata,
): ZodObject<Record<string, ZodType<unknown>>> => {
	const shape: Record<string, ZodType<unknown>> = {}

	const typeMappings: Record<string, () => ZodType<any>> = {
		select: () => z.string(),
		relationship: () => z.string(),
		upload: () => z.string(),
		date: () => z.date(),
		checkbox: () => z.boolean(),
		number: () => z.coerce.number(),
		email: () => z.string().email(),
		text: () => z.string(),
		switch: () => z.boolean(),
		table: () => z.array(z.record(z.string(), z.unknown())),
		array: () => z.array(z.unknown()),
	}

	const validationMappings: Record<
		string,
		(field: ZodType<any>, constraints: any[]) => ZodType<any>
	> = {
		isString: () => z.string(),
		isLength: (field, constraints) =>
			(field as z.ZodString).min(constraints[0]).max(constraints[1]),
		isInt: (field) => (field instanceof z.ZodNumber ? field.int() : field),
		min: (field, constraints) => {
			if (field instanceof z.ZodNumber || field instanceof z.ZodString) {
				return field.min(constraints[0])
			}
			if (field instanceof z.ZodDate) {
				return field.min(new Date(constraints[0]))
			}
			return field
		},
		max: (field, constraints) => {
			if (field instanceof z.ZodNumber || field instanceof z.ZodString) {
				return field.max(constraints[0])
			}
			if (field instanceof z.ZodDate) {
				return field.max(new Date(constraints[0]))
			}
			return field
		},
		regex: (field, constraints) =>
			field instanceof z.ZodString
				? field.regex(new RegExp(constraints[0]))
				: field,
		isNotEmpty: (field) =>
			field instanceof z.ZodString ? field.min(1) : field,
		isPhoneNumber: (field) =>
			field instanceof z.ZodString ? field.regex(/^\+?[1-9]\d{1,14}$/) : field, // E.164 format
		isDate: (field) => (field instanceof z.ZodDate ? field : z.date()),
		isNumber: (field) => (field instanceof z.ZodNumber ? field : z.number()),
	}

	// Only include properties that have UI defined (skip hidden fields like password)
	schema.properties
		.filter((prop) => prop.ui !== undefined && prop.ui !== null)
		.forEach((prop: SchemaProperty) => {
			let field = typeMappings[prop.ui?.type || 'text']?.() || z.string()

			if (prop.ui?.type === 'select' && (prop.ui as UISelect).multi) {
				field = z.array(z.string())
			}

			// Handle relationship fields - arrays are multi-select, single is select
			if (prop.ui?.type === 'relationship') {
				field = prop.isArray ? z.array(z.string()) : z.string()
			}

			// Handle upload fields - arrays are multiple uploads, single is one upload
			if (prop.ui?.type === 'upload') {
				field = prop.isArray ? z.array(z.string()) : z.string()
			}

			if (prop.validations) {
				prop.validations.forEach((validation) => {
					if (validationMappings[validation.name]) {
						const validationFn = validationMappings[validation.name]
						if (validationFn) {
							field = validationFn(
								field,
								(validation.constraints as unknown[]) || [],
							)
						}
					}
				})
			}

			field = prop.required ? field : field.optional()

			shape[prop.name] = field
		})

	return z.object(shape)
}
