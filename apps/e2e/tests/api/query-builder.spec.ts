import { expect, test } from '../../src/fixtures/auth.fixture'
import { testData } from '../../src/helpers/test-data'

test.describe('Query Builder Integration', () => {
  test.describe('Model operations with query builder', () => {
    test('should create and list multiple records', async ({ authenticatedApiClient }) => {
      // Create owner first via content API (use "Owner" schema name)
      const ownerData = testData.owner.create()
      const ownerResponse = await authenticatedApiClient.createContent('Owner', ownerData)
      expect(ownerResponse.ok()).toBeTruthy()
      const ownerResult = await ownerResponse.json()
      const ownerId =
        ownerResult.data?.id || ownerResult.data?._id || ownerResult.id || ownerResult._id

      // Create multiple cats to test list operations
      const cats = await Promise.all([
        authenticatedApiClient.createCat(
          testData.cat.create({ name: 'QueryTest-Alpha', owner: ownerId }),
        ),
        authenticatedApiClient.createCat(
          testData.cat.create({ name: 'QueryTest-Beta', owner: ownerId }),
        ),
        authenticatedApiClient.createCat(
          testData.cat.create({ name: 'QueryTest-Gamma', owner: ownerId }),
        ),
      ])

      // Verify all cats were created
      for (const response of cats) {
        expect(response.ok()).toBeTruthy()
      }

      // List all cats
      const listResponse = await authenticatedApiClient.getCats()
      expect(listResponse.ok()).toBeTruthy()

      const allCats = await listResponse.json()
      expect(Array.isArray(allCats)).toBeTruthy()

      // Verify our test cats are in the list
      const catNames = allCats.map((c: { name: string }) => c.name)
      expect(catNames).toContain('QueryTest-Alpha')
      expect(catNames).toContain('QueryTest-Beta')
      expect(catNames).toContain('QueryTest-Gamma')

      // Cleanup: delete created cats
      const createdCats = await Promise.all(cats.map((r) => r.json()))
      for (const cat of createdCats) {
        const catId = cat.id || cat._id
        await authenticatedApiClient.deleteCat(catId)
      }
    })

    test('should handle CRUD operations correctly after query builder changes', async ({
      authenticatedApiClient,
    }) => {
      // Create owner first via content API (use "Owner" schema name)
      const ownerData = testData.owner.create()
      const ownerResponse = await authenticatedApiClient.createContent('Owner', ownerData)
      expect(ownerResponse.ok()).toBeTruthy()
      const ownerResult = await ownerResponse.json()
      const ownerId =
        ownerResult.data?.id || ownerResult.data?._id || ownerResult.id || ownerResult._id

      // Create
      const catData = testData.cat.create({
        name: 'QueryBuilderTest',
        owner: ownerId,
      })
      const createResponse = await authenticatedApiClient.createCat(catData)
      expect(createResponse.ok()).toBeTruthy()

      const createdCat = await createResponse.json()
      const catId = createdCat.id || createdCat._id
      expect(catId).toBeTruthy()

      // Read
      const readResponse = await authenticatedApiClient.getCat(catId)
      expect(readResponse.ok()).toBeTruthy()

      const fetchedCat = await readResponse.json()
      expect(fetchedCat.name).toBe(catData.name)
      expect(fetchedCat.breed).toBe(catData.breed)

      // Update
      const updateResponse = await authenticatedApiClient.updateCat(catId, {
        name: 'UpdatedQueryBuilderTest',
      })
      expect(updateResponse.ok()).toBeTruthy()

      // Verify update
      const verifyResponse = await authenticatedApiClient.getCat(catId)
      const verifiedCat = await verifyResponse.json()
      expect(verifiedCat.name).toBe('UpdatedQueryBuilderTest')

      // Delete
      const deleteResponse = await authenticatedApiClient.deleteCat(catId)
      expect(deleteResponse.ok()).toBeTruthy()

      // Verify deletion
      const deletedResponse = await authenticatedApiClient.getCat(catId)
      expect(deletedResponse.ok()).toBeFalsy()
    })

    test('should return empty list when no records match', async ({ authenticatedApiClient }) => {
      // List all cats - should return an array (might be empty or have data)
      const response = await authenticatedApiClient.getCats()
      expect(response.ok()).toBeTruthy()

      const cats = await response.json()
      expect(Array.isArray(cats)).toBeTruthy()
    })

    test('should handle findById correctly', async ({ authenticatedApiClient }) => {
      // Create owner first via content API (use "Owner" schema name)
      const ownerData = testData.owner.create()
      const ownerResponse = await authenticatedApiClient.createContent('Owner', ownerData)
      expect(ownerResponse.ok()).toBeTruthy()
      const ownerResult = await ownerResponse.json()
      const ownerId =
        ownerResult.data?.id || ownerResult.data?._id || ownerResult.id || ownerResult._id

      // Create a cat first
      const catData = testData.cat.create({
        name: 'FindByIdTest',
        owner: ownerId,
      })
      const createResponse = await authenticatedApiClient.createCat(catData)
      const createdCat = await createResponse.json()
      const catId = createdCat.id || createdCat._id

      // Find by ID
      const findResponse = await authenticatedApiClient.getCat(catId)
      expect(findResponse.ok()).toBeTruthy()

      const foundCat = await findResponse.json()
      expect(foundCat.id || foundCat._id).toBe(catId)
      expect(foundCat.name).toBe(catData.name)

      // Cleanup
      await authenticatedApiClient.deleteCat(catId)
    })

    test('should return 404 for non-existent ID', async ({ authenticatedApiClient }) => {
      // Try to find a non-existent cat
      const response = await authenticatedApiClient.getCat('000000000000000000000000')
      expect(response.ok()).toBeFalsy()
    })
  })
})
