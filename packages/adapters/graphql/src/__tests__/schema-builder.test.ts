import type { ControllerMetadata } from '@magnet-cms/common'
import { GraphQLSchema } from 'graphql'
import { describe, expect, it } from 'vitest'
import { buildGraphQLSchema } from '../schema-builder'

/** Minimal ContentService stub */
const contentService = {
	list: async () => [],
	findByDocumentId: async () => null,
	getVersions: async () => [],
	create: async () => ({}),
	update: async () => ({}),
	delete: async () => true,
	publish: async () => ({}),
	unpublish: async () => true,
	addLocale: async () => ({}),
	deleteLocale: async () => true,
} as never

/** Controller instance with the method that matches the metadata name */
class MediaController {
	// method name lowercased must match method.name in metadata ('deletefolders')
	deleteFolders() {
		return null
	}
}

function buildSchema(controllers: ControllerMetadata[]): GraphQLSchema {
	const instances = new Map<string, object>()
	instances.set('mediacontroller', new MediaController())
	return buildGraphQLSchema([], contentService, controllers, instances)
}

describe('buildGraphQLSchema — wildcard route params', () => {
	it('should not throw when controller has a wildcard *param route', () => {
		const controller: ControllerMetadata = {
			name: 'mediacontroller',
			basePath: '/media',
			methods: [
				{
					name: 'deletefolders',
					httpMethod: 'DELETE',
					routePath: 'folders/*path',
					returnType: { type: Object as never, isArray: false },
					params: [{ arg: 'PARAM', type: 'String', name: 'path' }],
				},
			],
		}

		// Must not throw GraphQLError: Names must only contain [_a-zA-Z0-9]
		expect(() => buildSchema([controller])).not.toThrow()
	})

	it('should produce a valid GraphQL field name for wildcard routes', () => {
		const controller: ControllerMetadata = {
			name: 'mediacontroller',
			basePath: '/media',
			methods: [
				{
					name: 'deletefolders',
					httpMethod: 'DELETE',
					routePath: 'folders/*path',
					returnType: { type: Object as never, isArray: false },
					params: [{ arg: 'PARAM', type: 'String', name: 'path' }],
				},
			],
		}

		const schema = buildSchema([controller])
		const mutationType = schema.getMutationType()
		const fieldNames = Object.keys(mutationType?.getFields() ?? {})

		// Field name must only contain valid GraphQL characters
		for (const name of fieldNames) {
			expect(name).toMatch(/^[_a-zA-Z][_a-zA-Z0-9]*$/)
		}

		// Should contain a field for this mutation (wildcard segment stripped)
		expect(fieldNames.some((n) => n.startsWith('delete'))).toBe(true)
	})
})
