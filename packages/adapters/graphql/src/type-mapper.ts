import {
	GraphQLBoolean,
	GraphQLFloat,
	GraphQLList,
	GraphQLString,
} from 'graphql'
import type { GraphQLOutputType } from 'graphql'
import { GraphQLJSON } from 'graphql-scalars'

/**
 * Maps a SchemaProperty type string to the corresponding GraphQL output type.
 * When isArray is true, wraps the base type in GraphQLList.
 */
export function mapPropertyTypeToGraphQL(
	type: string,
	isArray: boolean,
): GraphQLOutputType {
	let baseType: GraphQLOutputType

	switch (type) {
		case 'String':
		case 'Date':
		case 'Email':
		case 'Url':
		case 'Phone':
		case 'Color':
			baseType = GraphQLString
			break
		case 'Number':
		case 'Float':
			baseType = GraphQLFloat
			break
		case 'Boolean':
			baseType = GraphQLBoolean
			break
		case 'Object':
			baseType = GraphQLJSON
			break
		default:
			baseType = GraphQLJSON
			break
	}

	return isArray ? new GraphQLList(baseType) : baseType
}

/**
 * Maps a SchemaProperty type string to the corresponding GraphQL input type.
 * Input types use the same scalars but JSON for objects/arrays.
 */
export function mapPropertyTypeToGraphQLInput(
	type: string,
	isArray: boolean,
): GraphQLOutputType {
	// Input and output types share the same scalar mapping for our use case
	return mapPropertyTypeToGraphQL(type, isArray)
}

/**
 * Converts a display name (possibly with spaces) to a PascalCase identifier
 * suitable for use as a GraphQL type name.
 * Examples: "Medical Record" → "MedicalRecord", "Cat" → "Cat"
 */
export function toPascalCaseName(displayName: string): string {
	return displayName
		.split(/[\s_-]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join('')
}
