import type { ControllerMetadata, MethodMetadata, SchemaMetadata } from '@magnet-cms/common'
import type { ContentService } from '@magnet-cms/core'
import {
  GraphQLBoolean,
  GraphQLFieldConfig,
  GraphQLFloat,
  GraphQLInputFieldConfig,
  GraphQLInputObjectType,
  GraphQLInputType,
  GraphQLInt,
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

/** Param types that come from GraphQL arguments (not from request context) */
const GQL_ARG_PARAM_TYPES = new Set(['PARAM', 'QUERY'])

/** Param types that come from the request body (mapped to `input` arg in GraphQL) */
const BODY_PARAM_TYPES = new Set(['BODY'])

/** Param types that are injected from context (request, response, etc.) */
const _CONTEXT_PARAM_TYPES = new Set([
  'REQUEST',
  'RESPONSE',
  'NEXT',
  'HEADERS',
  'SESSION',
  'HOST',
  'IP',
])

/** Param types that indicate file upload (skip these methods for GraphQL) */
const FILE_PARAM_TYPES = new Set(['FILE', 'FILES'])

/** HTTP methods that map to GraphQL queries */
const QUERY_HTTP_METHODS = new Set(['GET'])

/** Internal Magnet controllers that should not be exposed via GraphQL */
const EXCLUDED_CONTROLLERS = new Set([
  'magnetcontentcontroller',
  'magnetauthcontroller',
  'magnetadmincontroller',
  'magnetuploadcontroller',
  'magnetsettingscontroller',
  'magnetplaygroundcontroller',
])

/** Builds document metadata fields added to every ObjectType */
function buildDocumentMetaFields(): Record<string, GraphQLFieldConfig<unknown, AnyContext>> {
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

// ── Controller → GraphQL helpers ──────────────────────────────────────────────

/**
 * Resolves a controller instance from the instance map.
 * Tries both the full name and common variations.
 */
function resolveControllerInstance(
  controllerName: string,
  instances: Map<string, object>,
): object | undefined {
  return instances.get(controllerName) ?? instances.get(controllerName.replace('controller', ''))
}

/**
 * Checks if a method has file upload params (which can't be auto-resolved to GraphQL).
 */
function hasFileParams(method: MethodMetadata): boolean {
  return method.params.some((p) => FILE_PARAM_TYPES.has(p.arg))
}

/**
 * Maps a NestJS param type string to a GraphQL input scalar type.
 */
function mapParamTypeToGraphQLInput(typeName: string): GraphQLInputType {
  switch (typeName) {
    case 'String':
      return GraphQLString
    case 'Number':
      return GraphQLFloat
    case 'Boolean':
      return GraphQLBoolean
    case 'Int':
      return GraphQLInt
    default:
      return GraphQLString // Default to string for route params
  }
}

/**
 * Builds a unique GraphQL field name from the controller base path and method metadata.
 *
 * Strategy:
 * - Extract non-param segments from the full path (basePath + routePath)
 * - Convert to camelCase
 * - For mutations: prefix with the HTTP method verb
 *
 * Examples:
 *   GET  /trips           → trips
 *   GET  /trips/:id       → trip (singularized)
 *   POST /trips           → createTrip
 *   GET  /trips/:id/days  → tripDays
 *   PATCH /trips/:id/public → updateTripPublic
 */
function buildFieldName(basePath: string, method: MethodMetadata): string {
  const fullPath = `${basePath}/${method.routePath}`.replace(/\/+/g, '/')
  const segments = fullPath.split('/').filter((s) => s && !s.startsWith(':') && !s.startsWith('*'))

  if (segments.length === 0) return method.name

  // Convert segments to PascalCase
  const pascalSegments = segments.map((s) =>
    s
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(''),
  )

  const resourceName = pascalSegments.join('')
  const isQuery = QUERY_HTTP_METHODS.has(method.httpMethod)

  // Determine if this is a list or detail endpoint
  // Detail: the route path ends with a param (e.g., :id)
  const pathParts = fullPath.split('/').filter(Boolean)
  const lastPart = pathParts[pathParts.length - 1]
  const isDetail = lastPart?.startsWith(':') || lastPart?.startsWith('*')

  if (isQuery) {
    const name = resourceName.charAt(0).toLowerCase() + resourceName.slice(1)
    // For list endpoints, keep plural. For detail, try to singularize.
    if (isDetail && name.endsWith('s') && !name.endsWith('ss')) {
      return name.slice(0, -1) // Simple singularization
    }
    return name
  }

  // Mutations: prefix with verb
  const verbMap: Record<string, string> = {
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  }
  const verb = verbMap[method.httpMethod] ?? method.httpMethod.toLowerCase()

  return `${verb}${resourceName}`
}

/**
 * Builds GraphQL arguments from a controller method's parameter metadata.
 * Maps PARAM/QUERY params to GraphQL args, BODY to an `input` JSON arg.
 */
function buildGraphQLArgs(method: MethodMetadata): Record<string, { type: GraphQLInputType }> {
  const args: Record<string, { type: GraphQLInputType }> = {}
  let hasBody = false

  for (const param of method.params) {
    if (GQL_ARG_PARAM_TYPES.has(param.arg)) {
      // Route params (:id) and query params (?search=) become named args
      const gqlType = mapParamTypeToGraphQLInput(param.type)
      args[param.name] = { type: gqlType }
    } else if (BODY_PARAM_TYPES.has(param.arg)) {
      hasBody = true
    }
    // CONTEXT_PARAM_TYPES and FILE_PARAM_TYPES are handled separately
  }

  if (hasBody) {
    args.input = { type: GraphQLJSON }
  }

  return args
}

/**
 * Builds the argument values array for calling a controller method,
 * mapping from GraphQL args and context to the expected parameter positions.
 */
function buildMethodArgs(
  params: MethodMetadata['params'],
  gqlArgs: Record<string, unknown>,
  context: AnyContext,
): unknown[] {
  return params.map((param) => {
    if (GQL_ARG_PARAM_TYPES.has(param.arg)) {
      return gqlArgs[param.name]
    }
    if (BODY_PARAM_TYPES.has(param.arg)) {
      return gqlArgs.input ?? gqlArgs
    }
    if (param.arg === 'REQUEST') {
      return context.req
    }
    if (param.arg === 'RESPONSE') {
      return context.res
    }
    if (param.arg === 'HEADERS') {
      return (context.req as Record<string, unknown>)?.headers
    }
    return undefined
  })
}

/**
 * Builds GraphQL query and mutation fields from discovered NestJS controllers.
 * Each controller method becomes a query (GET) or mutation (POST/PUT/PATCH/DELETE).
 * Resolvers call the actual controller instance methods with mapped arguments.
 */
function buildControllerGraphQLFields(
  controllers: ControllerMetadata[],
  controllerInstances: Map<string, object>,
): {
  queries: Record<string, GraphQLFieldConfig<unknown, AnyContext>>
  mutations: Record<string, GraphQLFieldConfig<unknown, AnyContext>>
} {
  const queries: Record<string, GraphQLFieldConfig<unknown, AnyContext>> = {}
  const mutations: Record<string, GraphQLFieldConfig<unknown, AnyContext>> = {}

  for (const controller of controllers) {
    // Skip internal Magnet controllers
    if (EXCLUDED_CONTROLLERS.has(controller.name)) continue

    const instance = resolveControllerInstance(controller.name, controllerInstances)
    if (!instance) continue

    for (const method of controller.methods) {
      // Skip methods with file upload params (stay REST-only)
      if (hasFileParams(method)) continue

      // Skip methods that inject @Res() — they handle the response directly
      if (method.params.some((p) => p.arg === 'RESPONSE')) continue

      // Skip UNKNOWN http methods (non-route methods like lifecycle hooks)
      if (method.httpMethod === 'UNKNOWN') continue

      const fieldName = buildFieldName(controller.basePath, method)
      const args = buildGraphQLArgs(method)
      const isQuery = QUERY_HTTP_METHODS.has(method.httpMethod)

      // Find the original method name on the instance (metadata lowercases it)
      const originalMethodName = Object.getOwnPropertyNames(Object.getPrototypeOf(instance)).find(
        (m) => m.toLowerCase() === method.name,
      )

      if (!originalMethodName) continue

      const field: GraphQLFieldConfig<unknown, AnyContext> = {
        type: GraphQLJSON, // Generic return type — works for any shape
        args,
        resolve: async (_: unknown, gqlArgs: Record<string, unknown>, context: AnyContext) => {
          const methodArgs = buildMethodArgs(method.params, gqlArgs, context)
          const fn = (instance as Record<string, unknown>)[originalMethodName]
          if (typeof fn !== 'function') {
            throw new Error(`Method ${originalMethodName} not found on controller`)
          }
          return fn.apply(instance, methodArgs)
        },
      }

      if (isQuery) {
        queries[fieldName] = field
      } else {
        mutations[fieldName] = field
      }
    }
  }

  return { queries, mutations }
}

// ── Main schema builder ───────────────────────────────────────────────────────

/**
 * Builds a complete GraphQL schema from discovered content schemas and controllers.
 *
 * Content schemas get typed CRUD queries/mutations (list, find, create, update, delete, publish, etc.).
 * Controller methods get auto-resolved queries (GET) and mutations (POST/PUT/PATCH/DELETE) with
 * arguments mapped from NestJS parameter decorators.
 */
export function buildGraphQLSchema(
  schemas: SchemaMetadata[],
  contentService: ContentService,
  controllers?: ControllerMetadata[],
  controllerInstances?: Map<string, object>,
): GraphQLSchema {
  const DeleteResultType = new GraphQLObjectType({
    name: 'DeleteResult',
    fields: { success: { type: GraphQLBoolean } },
  })

  const GenericResultType = new GraphQLObjectType({
    name: 'GenericResult',
    fields: { success: { type: GraphQLBoolean } },
  })

  const queryFields: Record<string, GraphQLFieldConfig<unknown, AnyContext>> = {}
  const mutationFields: Record<string, GraphQLFieldConfig<unknown, AnyContext>> = {}

  for (const schema of schemas) {
    const typeName = toPascalCaseName(schema.displayName ?? schema.className ?? schema.name)
    const schemaName = schema.apiName ?? schema.name

    // Build property fields for ObjectType
    const objectPropertyFields: Record<string, GraphQLFieldConfig<unknown, AnyContext>> = {}
    const inputPropertyFields: Record<string, GraphQLInputFieldConfig> = {}

    for (const prop of schema.properties) {
      const gqlType: GraphQLOutputType = mapPropertyTypeToGraphQL(prop.type, prop.isArray)
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
      resolve: async (_: unknown, args: { locale?: string; status?: string }) => {
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
        const result = await contentService.findByDocumentId(schemaName, args.documentId, {
          locale: args.locale,
          status: args.status as 'draft' | 'published' | undefined,
        })
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
      resolve: async (_: unknown, args: { documentId: string; locale?: string }) => {
        return contentService.getVersions(schemaName, args.documentId, args.locale)
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
      resolve: async (_: unknown, args: { documentId: string; locale?: string }) => {
        const result = await contentService.unpublish(schemaName, args.documentId, args.locale)
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
        return contentService.addLocale(schemaName, args.documentId, args.locale, args.input, {
          createdBy: args.createdBy,
        })
      },
    }

    mutationFields[`delete${typeName}Locale`] = {
      type: GenericResultType,
      args: {
        documentId: { type: new GraphQLNonNull(GraphQLString) },
        locale: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: async (_: unknown, args: { documentId: string; locale: string }) => {
        const result = await contentService.deleteLocale(schemaName, args.documentId, args.locale)
        return { success: result }
      },
    }
  }

  // ── Controller-based fields ───────────────────────────────────────────────

  if (controllers && controllerInstances) {
    const { queries, mutations } = buildControllerGraphQLFields(controllers, controllerInstances)
    Object.assign(queryFields, queries)
    Object.assign(mutationFields, mutations)
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
