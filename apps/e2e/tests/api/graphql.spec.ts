import type { APIRequestContext } from '@playwright/test'
import { expect, test } from '../../src/fixtures/auth.fixture'

const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType { name }
      mutationType { name }
      types {
        name
        kind
      }
    }
  }
`

async function gql(
	request: APIRequestContext,
	apiBaseURL: string,
	query: string,
	variables?: Record<string, unknown>,
	token?: string,
) {
	return request.post(`${apiBaseURL}/graphql`, {
		headers: {
			'Content-Type': 'application/json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		data: { query, variables },
	})
}

test.describe('GraphQL API', () => {
	test('introspection returns schema with Query and Mutation types', async ({
		request,
		apiBaseURL,
		testUser,
	}) => {
		const response = await gql(
			request,
			apiBaseURL,
			INTROSPECTION_QUERY,
			undefined,
			testUser.token,
		)

		expect(response.ok()).toBeTruthy()
		const body = await response.json()
		expect(body.errors).toBeUndefined()
		expect(body.data.__schema.queryType.name).toBe('Query')
		expect(body.data.__schema.mutationType.name).toBe('Mutation')
	})

	test('introspection returns generated content types', async ({
		request,
		apiBaseURL,
		testUser,
	}) => {
		const response = await gql(
			request,
			apiBaseURL,
			INTROSPECTION_QUERY,
			undefined,
			testUser.token,
		)

		expect(response.ok()).toBeTruthy()
		const body = await response.json()
		const typeNames: string[] = body.data.__schema.types.map(
			(t: { name: string }) => t.name,
		)

		// The mongoose example app has Cat, Owner, Veterinarian, MedicalRecord schemas
		expect(typeNames).toContain('CatType')
		expect(typeNames).toContain('OwnerType')
		expect(typeNames).toContain('CatInput')
		expect(typeNames).toContain('CatUpdateInput')
	})

	test('listCat query returns array', async ({
		request,
		apiBaseURL,
		testUser,
	}) => {
		const response = await gql(
			request,
			apiBaseURL,
			'query { listCat { documentId status } }',
			undefined,
			testUser.token,
		)

		expect(response.ok()).toBeTruthy()
		const body = await response.json()
		expect(body.errors).toBeUndefined()
		expect(Array.isArray(body.data.listCat)).toBeTruthy()
	})

	test('createCat mutation creates a document', async ({
		request,
		apiBaseURL,
		testUser,
	}) => {
		const response = await gql(
			request,
			apiBaseURL,
			`mutation CreateCat($input: CatInput!, $locale: String) {
        createCat(input: $input, locale: $locale) {
          documentId
          status
        }
      }`,
			{
				input: {
					name: 'GraphQL Test Cat',
					breed: 'Siamese',
					weight: 4.5,
					castrated: false,
					tagID: 'gql-test-001',
				},
				locale: 'en',
			},
			testUser.token,
		)

		expect(response.ok()).toBeTruthy()
		const body = await response.json()
		expect(body.errors).toBeUndefined()
		expect(body.data.createCat.documentId).toBeTruthy()
		expect(body.data.createCat.status).toBe('draft')
	})

	test('publishCat mutation changes status to published', async ({
		request,
		apiBaseURL,
		testUser,
	}) => {
		// First create a cat
		const createResponse = await gql(
			request,
			apiBaseURL,
			`mutation {
        createCat(input: { name: "Publish Test", tagID: "pub-001", breed: "Tabby", weight: 3.0, castrated: false }) {
          documentId
        }
      }`,
			undefined,
			testUser.token,
		)
		const createBody = await createResponse.json()
		const documentId = createBody.data?.createCat?.documentId
		expect(documentId).toBeTruthy()

		// Then publish it
		const publishResponse = await gql(
			request,
			apiBaseURL,
			`mutation PublishCat($documentId: String!) {
        publishCat(documentId: $documentId) {
          documentId
          status
        }
      }`,
			{ documentId },
			testUser.token,
		)

		expect(publishResponse.ok()).toBeTruthy()
		const publishBody = await publishResponse.json()
		expect(publishBody.errors).toBeUndefined()
		expect(publishBody.data.publishCat.status).toBe('published')
	})
})
