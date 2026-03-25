import { expect, test } from '../../src/fixtures/auth.fixture'
import { testData } from '../../src/helpers/test-data'

test.describe('Cats API', () => {
  test('GET /cats returns list of cats', async ({ authenticatedApiClient }) => {
    const response = await authenticatedApiClient.getCats()

    expect(response.ok()).toBeTruthy()

    const cats = await response.json()
    expect(Array.isArray(cats)).toBeTruthy()
  })

  test('POST /cats creates a new cat', async ({ authenticatedApiClient }) => {
    // Create owner first
    const ownerData = testData.owner.create()
    const ownerResponse = await authenticatedApiClient.createOwner(ownerData)
    expect(ownerResponse.ok()).toBeTruthy()
    const owner = await ownerResponse.json()
    const ownerId = owner.id || owner._id

    // Create cat with owner reference
    const catData = testData.cat.create({
      name: 'Whiskers',
      owner: ownerId,
    })

    const response = await authenticatedApiClient.createCat(catData)

    expect(response.ok()).toBeTruthy()

    const cat = await response.json()
    expect(cat.name).toBe(catData.name)
    expect(cat.breed).toBe(catData.breed)
    expect(cat.weight).toBe(catData.weight)
  })

  test('CRUD flow for cats', async ({ authenticatedApiClient }) => {
    // Create owner first
    const ownerData = testData.owner.create()
    const ownerResponse = await authenticatedApiClient.createOwner(ownerData)
    expect(ownerResponse.ok()).toBeTruthy()
    const owner = await ownerResponse.json()
    const ownerId = owner.id || owner._id

    // Create cat
    const catData = testData.cat.create({ owner: ownerId })
    const createResponse = await authenticatedApiClient.createCat(catData)
    expect(createResponse.ok()).toBeTruthy()
    const createdCat = await createResponse.json()
    const catId = createdCat.id || createdCat._id

    // Read
    const getResponse = await authenticatedApiClient.getCat(catId)
    expect(getResponse.ok()).toBeTruthy()
    const fetchedCat = await getResponse.json()
    expect(fetchedCat.name).toBe(catData.name)

    // Update
    const updateResponse = await authenticatedApiClient.updateCat(catId, {
      name: 'Updated Name',
    })
    expect(updateResponse.ok()).toBeTruthy()

    // Verify update
    const verifyResponse = await authenticatedApiClient.getCat(catId)
    const verifiedCat = await verifyResponse.json()
    expect(verifiedCat.name).toBe('Updated Name')

    // Delete
    const deleteResponse = await authenticatedApiClient.deleteCat(catId)
    expect(deleteResponse.ok()).toBeTruthy()

    // Verify deletion
    const deletedResponse = await authenticatedApiClient.getCat(catId)
    expect(deletedResponse.ok()).toBeFalsy()
  })
})
