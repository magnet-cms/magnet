import 'reflect-metadata'
import { NotFoundException } from '@nestjs/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Must be hoisted before any import that transitively loads @magnet-cms/common decorators.
// We do NOT use importOriginal here because loading the real @magnet-cms/common triggers
// detectDatabaseAdapter() as a side effect of decorator evaluation, which throws when no
// adapter package is installed in the test environment.
vi.mock('@magnet-cms/common', () => ({
  InjectModel: () => () => {},
  Model: class {},
  Schema: () => () => {},
  Field: new Proxy({}, { get: () => () => () => {} }),
  Prop: () => () => {},
  hash: vi.fn(async (pw: string) => `hashed:${pw}`),
}))

// Mock bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn(async (pw: string) => `hashed:${pw}`),
}))

import { UserService } from '../user.service'

// ─── Mock Model ───────────────────────────────────────────────────────────────

const mockUserModel = {
  find: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

describe('UserService', () => {
  let service: UserService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new UserService(mockUserModel as never)
  })

  // ─── findAll ──────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [{ id: '1', email: 'a@b.com' }]
      mockUserModel.find.mockResolvedValue(users)

      const result = await service.findAll()
      expect(result).toEqual(users)
      expect(mockUserModel.find).toHaveBeenCalledOnce()
    })

    it('should return empty array when no users', async () => {
      mockUserModel.find.mockResolvedValue([])
      expect(await service.findAll()).toEqual([])
    })
  })

  // ─── findAllPaginated ────────────────────────────────────────────────

  describe('findAllPaginated', () => {
    const makeUsers = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        id: String(i + 1),
        email: `u${i + 1}@x.com`,
      }))

    it('should return first page with default params', async () => {
      const users = makeUsers(25)
      mockUserModel.find.mockResolvedValue(users)

      const result = await service.findAllPaginated()
      expect(result.users).toHaveLength(20)
      expect(result.total).toBe(25)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should return second page', async () => {
      const users = makeUsers(25)
      mockUserModel.find.mockResolvedValue(users)

      const result = await service.findAllPaginated(2, 20)
      expect(result.users).toHaveLength(5)
      expect(result.page).toBe(2)
    })

    it('should return empty users when page exceeds data', async () => {
      const users = makeUsers(5)
      mockUserModel.find.mockResolvedValue(users)

      const result = await service.findAllPaginated(3, 5)
      expect(result.users).toHaveLength(0)
      expect(result.total).toBe(5)
    })

    it('should return empty list for empty dataset', async () => {
      mockUserModel.find.mockResolvedValue([])

      const result = await service.findAllPaginated(1, 20)
      expect(result.users).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  // ─── findOne ─────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should find user by partial query', async () => {
      const user = { id: '1', email: 'a@b.com' }
      mockUserModel.findOne.mockResolvedValue(user)

      const result = await service.findOne({ email: 'a@b.com' })
      expect(result).toEqual(user)
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'a@b.com' })
    })

    it('should return null when user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null)
      expect(await service.findOne({ email: 'missing@x.com' })).toBeNull()
    })
  })

  // ─── findOneById ──────────────────────────────────────────────────────

  describe('findOneById', () => {
    it('should find user by id', async () => {
      const user = { id: '42', email: 'b@c.com' }
      mockUserModel.findOne.mockResolvedValue(user)

      const result = await service.findOneById('42')
      expect(result).toEqual(user)
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ id: '42' })
    })
  })

  // ─── create ───────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create and return a user', async () => {
      const userData = {
        id: '1',
        email: 'new@x.com',
        name: 'Alice',
        role: 'user',
      }
      mockUserModel.create.mockResolvedValue(userData)

      const result = await service.create(userData)
      expect(result).toEqual(userData)
      expect(mockUserModel.create).toHaveBeenCalledWith(userData)
    })
  })

  // ─── update ───────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update user by id', async () => {
      const updated = { id: '1', email: 'new@x.com', name: 'Updated' }
      mockUserModel.update.mockResolvedValue(updated)

      const result = await service.update('1', { name: 'Updated' })
      expect(result).toEqual(updated)
      expect(mockUserModel.update).toHaveBeenCalledWith({ id: '1' }, { name: 'Updated' })
    })
  })

  // ─── remove ───────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete user by id and return true', async () => {
      mockUserModel.delete.mockResolvedValue(true)

      const result = await service.remove('1')
      expect(result).toBe(true)
      expect(mockUserModel.delete).toHaveBeenCalledWith({ id: '1' })
    })
  })

  // ─── resetPassword ────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('should reset password for existing user', async () => {
      mockUserModel.findOne.mockResolvedValue({ id: '1', email: 'a@b.com' })
      mockUserModel.update.mockResolvedValue({})

      const result = await service.resetPassword('1', 'newpassword')
      expect(result).toEqual({ message: 'Password reset successfully' })
      expect(mockUserModel.update).toHaveBeenCalledWith(
        { id: '1' },
        { password: 'hashed:newpassword' },
      )
    })

    it('should throw NotFoundException when user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null)

      await expect(service.resetPassword('nonexistent', 'pw')).rejects.toThrow(NotFoundException)
      expect(mockUserModel.update).not.toHaveBeenCalled()
    })
  })
})
