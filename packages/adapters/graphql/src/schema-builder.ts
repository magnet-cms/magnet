import type { SchemaMetadata } from '@magnet-cms/common'
import type { ContentService } from '@magnet-cms/core'
import {
	GraphQLBoolean,
	GraphQLFieldConfig,
	GraphQLInputFieldConfig,
	GraphQLInputObjectType,
	GraphQLInputType,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	GraphQLOutputType,
	GraphQLSchema,
	GraphQLString,
} from 'graphql'
import { GraphQLJSON } from 'graphql-scalars'
import { mapPropertyTypeToGraphQL, toPascalCaseName } from './type-mapper'

type AnyContext = Record<string, unknown>

/** Builds document metadata fields added to every ObjectType */
function buildDocumentMetaFields(): Record<
	string,
	GraphQLFieldConfig<unknown, AnyContext>
> {
	return {
		_id: { type: GraphQLString },
		documentId: { type: GraphQLString },
		locale: { type: GraphQLString },
		status: { type: GraphQLString },
		createdAt: { type: GraphQLString },
		updatedAt: { type: GraphQLString },
		version: { type: GraphQLString },
	}
}

/**
 * Builds a complete GraphQL schema from discovered content schemas.
 * Queries and mutations delegate to ContentService.
 */
export function buildGraphQLSchema(
	schemas: SchemaMetadata[],
	contentService: ContentService,
): GraphQLSchema {
	const DeleteResultType = new GraphQLObjectType({
		name: 'DeleteResult',
		fields: { success: { type: GraphQLBoolean } },
	})

	const GenericResultType = new GraphQLObjectType({
		name: 'GenericResult',
		fields: { success: { type: GraphQLBoolean } },
	})

	const queryFields: Record<
		string,
		GraphQLFieldConfig<unknown, AnyContext>
	> = {}
	const mutationFields: Record<
		string,
		GraphQLFieldConfig<unknown, AnyContext>
	> = {}

	for (const schema of schemas) {
		const typeName = toPascalCaseName(
			schema.displayName ?? schema.className ?? schema.name,
		)
		const schemaName = schema.apiName ?? schema.name

		// Build property fields for ObjectType
		const objectPropertyFields: Record<
			string,
			GraphQLFieldConfig<unknown, AnyContext>
		> = {}
		const inputPropertyFields: Record<string, GraphQLInputFieldConfig> = {}

		for (const prop of schema.properties) {
			const gqlType: GraphQLOutputType = mapPropertyTypeToGraphQL(
				prop.type,
				prop.isArray,
			)
			objectPropertyFields[prop.name] = { type: gqlType }
			inputPropertyFields[prop.name] = {
				type: gqlType as unknown as GraphQLInputType,
			}
		}

		// {Name}Type — ObjectType with metadata + schema properties
		const ObjectType = new GraphQLObjectType({
			name: `${typeName}Type`,
			fields: {
				...buildDocumentMetaFields(),
				...objectPropertyFields,
				data: { type: GraphQLJSON },
			},
		})

		// {Name}Input — InputType for create
		const InputType = new GraphQLInputObjectType({
			name: `${typeName}Input`,
			fields: inputPropertyFields,
		})

		// {Name}UpdateInput — same fields, all optional
		const UpdateInputType = new GraphQLInputObjectType({
			name: `${typeName}UpdateInput`,
			fields: inputPropertyFields,
		})

		// ── Queries ──────────────────────────────────────────────────────────

		queryFields[`list${typeName}`] = {
			type: new GraphQLList(ObjectType),
			args: {
				locale: { type: GraphQLString },
				status: { type: GraphQLString },
			},
			resolve: async (
				_: unknown,
				args: { locale?: string; status?: string },
			) => {
				return contentService.list(schemaName, {
					locale: args.locale,
					status: args.status as 'draft' | 'published' | undefined,
				})
			},
		}

		queryFields[`find${typeName}`] = {
			type: ObjectType,
			args: {
				documentId: { type: new GraphQLNonNull(GraphQLString) },
				locale: { type: GraphQLString },
				status: { type: GraphQLString },
			},
			resolve: async (
				_: unknown,
				args: { documentId: string; locale?: string; status?: string },
			) => {
				const result = await contentService.findByDocumentId(
					schemaName,
					args.documentId,
					{
						locale: args.locale,
						status: args.status as 'draft' | 'published' | undefined,
					},
				)
				if (Array.isArray(result)) return result[0] ?? null
				return result
			},
		}

		const camelName = typeName.charAt(0).toLowerCase() + typeName.slice(1)
		queryFields[`${camelName}Versions`] = {
			type: new GraphQLList(GraphQLJSON),
			args: {
				documentId: { type: new GraphQLNonNull(GraphQLString) },
				locale: { type: GraphQLString },
			},
			resolve: async (
				_: unknown,
				args: { documentId: string; locale?: string },
			) => {
				return contentService.getVersions(
					schemaName,
					args.documentId,
					args.locale,
				)
			},
		}

		// ── Mutations ─────────────────────────────────────────────────────────

		mutationFields[`create${typeName}`] = {
			type: ObjectType,
			args: {
				input: { type: new GraphQLNonNull(InputType) },
				locale: { type: GraphQLString },
				createdBy: { type: GraphQLString },
			},
			resolve: async (
				_: unknown,
				args: {
					input: Record<string, unknown>
					locale?: string
					createdBy?: string
				},
			) => {
				return contentService.create(schemaName, args.input, {
					locale: args.locale,
					createdBy: args.createdBy,
				})
			},
		}

		mutationFields[`update${typeName}`] = {
			type: ObjectType,
			args: {
				documentId: { type: new GraphQLNonNull(GraphQLString) },
				input: { type: new GraphQLNonNull(UpdateInputType) },
				locale: { type: GraphQLString },
				status: { type: GraphQLString },
				updatedBy: { type: GraphQLString },
			},
			resolve: async (
				_: unknown,
				args: {
					documentId: string
					input: Record<string, unknown>
					locale?: string
					status?: string
					updatedBy?: string
				},
			) => {
				return contentService.update(schemaName, args.documentId, args.input, {
					locale: args.locale,
					status: args.status as 'draft' | 'published' | undefined,
					updatedBy: args.updatedBy,
				})
			},
		}

		mutationFields[`delete${typeName}`] = {
			type: DeleteResultType,
			args: {
				documentId: { type: new GraphQLNonNull(GraphQLString) },
			},
			resolve: async (_: unknown, args: { documentId: string }) => {
				const result = await contentService.delete(schemaName, args.documentId)
				return { success: Boolean(result) }
			},
		}

		mutationFields[`publish${typeName}`] = {
			type: ObjectType,
			args: {
				documentId: { type: new GraphQLNonNull(GraphQLString) },
				locale: { type: GraphQLString },
				publishedBy: { type: GraphQLString },
			},
			resolve: async (
				_: unknown,
				args: { documentId: string; locale?: string; publishedBy?: string },
			) => {
				return contentService.publish(schemaName, args.documentId, {
					locale: args.locale,
					publishedBy: args.publishedBy,
				})
			},
		}

		mutationFields[`unpublish${typeName}`] = {
			type: GenericResultType,
			args: {
				documentId: { type: new GraphQLNonNull(GraphQLString) },
				locale: { type: GraphQLString },
			},
			resolve: async (
				_: unknown,
				args: { documentId: string; locale?: string },
			) => {
				const result = await contentService.unpublish(
					schemaName,
					args.documentId,
					args.locale,
				)
				return { success: result }
			},
		}

		mutationFields[`add${typeName}Locale`] = {
			type: ObjectType,
			args: {
				documentId: { type: new GraphQLNonNull(GraphQLString) },
				locale: { type: new GraphQLNonNull(GraphQLString) },
				input: { type: new GraphQLNonNull(InputType) },
				createdBy: { type: GraphQLString },
			},
			resolve: async (
				_: unknown,
				args: {
					documentId: string
					locale: string
					input: Record<string, unknown>
					createdBy?: string
				},
			) => {
				return contentService.addLocale(
					schemaName,
					args.documentId,
					args.locale,
					args.input,
					{ createdBy: args.createdBy },
				)
			},
		}

		mutationFields[`delete${typeName}Locale`] = {
			type: GenericResultType,
			args: {
				documentId: { type: new GraphQLNonNull(GraphQLString) },
				locale: { type: new GraphQLNonNull(GraphQLString) },
			},
			resolve: async (
				_: unknown,
				args: { documentId: string; locale: string },
			) => {
				const result = await contentService.deleteLocale(
					schemaName,
					args.documentId,
					args.locale,
				)
				return { success: result }
			},
		}
	}

	const QueryType = new GraphQLObjectType({
		name: 'Query',
		fields: queryFields,
	})
	const MutationType = new GraphQLObjectType({
		name: 'Mutation',
		fields: mutationFields,
	})

	return new GraphQLSchema({ query: QueryType, mutation: MutationType })
}
