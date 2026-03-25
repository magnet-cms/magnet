import { randomBytes } from 'node:crypto'

import type { APIRequestContext } from '@playwright/test'

import { expect, test } from '../../src/fixtures/auth.fixture'
import { testData } from '../../src/helpers/test-data'

/** Cat.tagID must be Length(10, 20) in the mongoose example. */
function graphqlTagId(prefix: string): string {
  const hex = randomBytes(6).toString('hex')
  return `${prefix}-${hex}`
}

async function createOwnerId(
  request: APIRequestContext,
  apiBaseURL: string,
  token: string,
): Promise<string> {
  const ownerData = testData.owner.create()
  const res = await request.post(`${apiBaseURL}/owners`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: ownerData,
  })
  expect(res.ok()).toBeTruthy()
  const owner = (await res.json()) as { id?: string; _id?: string }
  const id = owner.id ?? owner._id
  expect(id).toBeTruthy()
  return id as string
}

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
    const response = await gql(request, apiBaseURL, INTROSPECTION_QUERY, undefined, testUser.token)

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
    const response = await gql(request, apiBaseURL, INTROSPECTION_QUERY, undefined, testUser.token)

    expect(response.ok()).toBeTruthy()
    const body = await response.json()
    const typeNames: string[] = body.data.__schema.types.map((t: { name: string }) => t.name)

    // The mongoose example app has Cat, Owner, Veterinarian, MedicalRecord schemas
    expect(typeNames).toContain('CatType')
    expect(typeNames).toContain('OwnerType')
    expect(typeNames).toContain('CatInput')
    expect(typeNames).toContain('CatUpdateInput')
  })

  test('listCat query returns array', async ({ request, apiBaseURL, testUser }) => {
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

  test('createCat mutation creates a document', async ({ request, apiBaseURL, testUser }) => {
    const tagID = graphqlTagId('gql')
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
          birthdate: '2019-06-15',
          tagID,
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
    const ownerId = await createOwnerId(request, apiBaseURL, testUser.token)
    const tagID = graphqlTagId('pub')
    // First create a cat (owner + birthdate required for validation on publish)
    const createResponse = await gql(
      request,
      apiBaseURL,
      `mutation CreateForPublish($tagID: String!, $ownerId: String!) {
        createCat(input: { name: "Publish Test", tagID: $tagID, breed: "Tabby", weight: 3.0, castrated: false, birthdate: "2020-01-10", owner: $ownerId }) {
          documentId
        }
      }`,
      { tagID, ownerId },
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
