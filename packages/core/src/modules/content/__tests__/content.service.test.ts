import type { SchemaMetadata } from '@magnet-cms/common'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ContentService } from '../content.service'
import type { DiscoveryService } from '../discovery/discovery.service'

import type { DocumentService } from '~/modules/document/document.service'
import type { EventService } from '~/modules/events'
import type { HistoryService } from '~/modules/history/history.service'
import type { MagnetLogger } from '~/modules/logging/logger.service'

// ─── Mock helpers ────────────────────────────────────────────────────────────

const mockModel = () => ({
  find: vi.fn(),
  findOne: vi.fn(),
  findMany: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
})

type MockModel = ReturnType<typeof mockModel>

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockDocumentService = {
  list: vi.fn(),
  findByDocumentId: vi.fn(),
  findDraft: vi.fn(),
  findPublished: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  publish: vi.fn(),
  unpublish: vi.fn(),
  delete: vi.fn(),
  deleteLocale: vi.fn(),
  addLocale: vi.fn(),
  getDocumentLocales: vi.fn(),
  getLocaleStatuses: vi.fn(),
} as unknown as DocumentService

const mockHistoryService = {
  findVersionsByLocale: vi.fn(),
  findVersions: vi.fn(),
  findVersionByNumber: vi.fn(),
  createVersion: vi.fn(),
} as unknown as HistoryService

const mockDiscoveryService = {
  getAllDiscoveredSchemas: vi.fn(),
  // Return error so sanitizeRichTextFields is a no-op for non-richtext test schemas
  getDiscoveredSchema: vi.fn().mockReturnValue({ error: 'Schema not found' }),
} as unknown as DiscoveryService

const mockEventService = {
  emit: vi.fn(),
} as unknown as EventService

const mockLogger = {
  setContext: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as unknown as MagnetLogger

const mockModuleRef = {
  get: vi.fn(),
} as unknown

// A registered model to return via global registry mock
let registeredModel: MockModel | null = null

// Mock getRegisteredModel from @magnet-cms/common
vi.mock('@magnet-cms/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@magnet-cms/common')>()
  return {
    ...actual,
    getRegisteredModel: vi.fn((token: string) => {
      if (!registeredModel) return null
      // Return registered model for any MAGNET_MODEL_* token
      if (token.startsWith('MAGNET_MODEL_')) return registeredModel
      return null
    }),
  }
})

// Mock getEventContext from ~/modules/events
vi.mock('~/modules/events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/modules/events')>()
  return {
    ...actual,
    getEventContext: vi.fn(() => undefined),
  }
})

describe('ContentService', () => {
  let service: ContentService
  let postModel: MockModel

  beforeEach(() => {
    vi.clearAllMocks()
    postModel = mockModel()
    registeredModel = postModel

    // Default: discoveryService returns empty list
    vi.mocked(mockDiscoveryService.getAllDiscoveredSchemas).mockReturnValue([])

    service = new ContentService(
      mockModuleRef as never,
      mockDocumentService,
      mockHistoryService,
      mockDiscoveryService,
      mockEventService,
      mockLogger,
      // No auth strategy
    )
  })

  // ─── getModel via token resolution ──────────────────────────────────────

  describe('getModel', () => {
    it('should find model by discovery apiName match', async () => {
      const schema: SchemaMetadata = {
        name: 'post',
        className: 'Post',
        apiName: 'post',
        properties: [],
      }
      vi.mocked(mockDiscoveryService.getAllDiscoveredSchemas).mockReturnValue([schema])

      vi.mocked(mockDocumentService.list).mockResolvedValue([])
      const result = await service.list('post')
      expect(result).toEqual([])
    })

    it('should throw when model is not found', async () => {
      registeredModel = null
      vi.mocked(mockDiscoveryService.getAllDiscoveredSchemas).mockReturnValue([])

      await expect(service.list('nonexistent-schema')).rejects.toThrow(
        "Model 'nonexistent-schema' not found",
      )
    })
  })

  // ─── toPascalCase (tested indirectly via list) ──────────────────────────

  describe('toPascalCase (via model resolution)', () => {
    it('should convert kebab-case schema name to PascalCase token', async () => {
      // medical-record -> MedicalRecord -> MAGNET_MODEL_MEDICALRECORD
      vi.mocked(mockDiscoveryService.getAllDiscoveredSchemas).mockReturnValue([])
      vi.mocked(mockDocumentService.list).mockResolvedValue([])
      await service.list('medical-record')
      expect(mockDocumentService.list).toHaveBeenCalledWith(postModel, {})
    })

    it('should fallback to simple capitalization for unknown names', async () => {
      // "cat" -> "Cat" -> MAGNET_MODEL_CAT
      vi.mocked(mockDiscoveryService.getAllDiscoveredSchemas).mockReturnValue([])
      vi.mocked(mockDocumentService.list).mockResolvedValue([])
      await service.list('cat')
      expect(mockDocumentService.list).toHaveBeenCalledWith(postModel, {})
    })
  })

  // ─── list ─────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should list documents using documentService', async () => {
      const docs = [{ id: '1', title: 'Hello' }]
      vi.mocked(mockDocumentService.list).mockResolvedValue(docs as never)

      const result = await service.list('cat', { status: 'published' })
      expect(result).toEqual(docs)
      expect(mockDocumentService.list).toHaveBeenCalledWith(postModel, {
        status: 'published',
      })
    })

    it('should use Supabase listUsers when auth strategy is supabase', async () => {
      const supabaseUsers = [{ id: 'u1', email: 'a@b.com', name: 'Alice', role: 'admin' }]
      const supabaseStrategy = {
        name: 'supabase',
        listUsers: vi.fn().mockResolvedValue(supabaseUsers),
      }

      const serviceWithAuth = new ContentService(
        mockModuleRef as never,
        mockDocumentService,
        mockHistoryService,
        mockDiscoveryService,
        mockEventService,
        mockLogger,
        supabaseStrategy as never,
      )

      const result = await serviceWithAuth.list('user')
      expect(result).toHaveLength(1)
      expect((result as typeof supabaseUsers)[0].email).toBe('a@b.com')
      expect(mockDocumentService.list).not.toHaveBeenCalled()
    })

    it('should fall back to database when Supabase listUsers throws', async () => {
      const supabaseStrategy = {
        name: 'supabase',
        listUsers: vi.fn().mockRejectedValue(new Error('Supabase error')),
      }

      // registeredModel is set globally — the fallback will find the model via MAGNET_MODEL_USER
      const serviceWithAuth = new ContentService(
        mockModuleRef as never,
        mockDocumentService,
        mockHistoryService,
        mockDiscoveryService,
        mockEventService,
        mockLogger,
        supabaseStrategy as never,
      )

      vi.mocked(mockDocumentService.list).mockResolvedValue([])
      await serviceWithAuth.list('user')
      expect(mockDocumentService.list).toHaveBeenCalled()
      expect(mockLogger.warn).toHaveBeenCalled()
    })
  })

  // ─── findByDocumentId ─────────────────────────────────────────────────

  describe('findByDocumentId', () => {
    it('should delegate to documentService.findByDocumentId', async () => {
      const doc = { id: '1', documentId: 'doc-123' }
      vi.mocked(mockDocumentService.findByDocumentId).mockResolvedValue(doc as never)

      const result = await service.findByDocumentId('cat', 'doc-123')
      expect(result).toEqual(doc)
      expect(mockDocumentService.findByDocumentId).toHaveBeenCalledWith(postModel, 'doc-123', {})
    })
  })

  // ─── create ────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create document and emit content.created event', async () => {
      const created = { id: '1', documentId: 'doc-abc', locale: 'en' }
      vi.mocked(mockDocumentService.create).mockResolvedValue(created as never)
      vi.mocked(mockEventService.emit).mockResolvedValue(undefined)

      const result = await service.create('cat', { title: 'New Post' })
      expect(result).toEqual(created)
      expect(mockEventService.emit).toHaveBeenCalledWith(
        'content.created',
        { schema: 'cat', documentId: 'doc-abc', locale: 'en' },
        undefined,
      )
    })

    it('should not throw when event emission fails', async () => {
      const created = { id: '1', documentId: 'doc-abc', locale: 'en' }
      vi.mocked(mockDocumentService.create).mockResolvedValue(created as never)
      vi.mocked(mockEventService.emit).mockRejectedValue(new Error('Event bus down'))

      await expect(service.create('cat', {})).resolves.toEqual(created)
      expect(mockLogger.warn).toHaveBeenCalled()
    })
  })

  // ─── update ────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update document and emit content.updated event', async () => {
      const updated = { id: '1', documentId: 'doc-abc' }
      vi.mocked(mockDocumentService.update).mockResolvedValue(updated as never)
      vi.mocked(mockEventService.emit).mockResolvedValue(undefined)

      const result = await service.update('cat', 'doc-abc', {
        title: 'Updated',
      })
      expect(result).toEqual(updated)
      expect(mockEventService.emit).toHaveBeenCalledWith(
        'content.updated',
        expect.objectContaining({ schema: 'cat', documentId: 'doc-abc' }),
        undefined,
      )
    })
  })

  // ─── publish ───────────────────────────────────────────────────────────

  describe('publish', () => {
    it('should publish document and emit content.published event', async () => {
      const published = { id: '1', documentId: 'doc-abc' }
      vi.mocked(mockDocumentService.publish).mockResolvedValue(published as never)
      vi.mocked(mockEventService.emit).mockResolvedValue(undefined)

      const result = await service.publish('cat', 'doc-abc')
      expect(result).toEqual(published)
      expect(mockEventService.emit).toHaveBeenCalledWith(
        'content.published',
        expect.objectContaining({ schema: 'cat', documentId: 'doc-abc' }),
        undefined,
      )
    })
  })

  // ─── unpublish ─────────────────────────────────────────────────────────

  describe('unpublish', () => {
    it('should unpublish document and emit content.unpublished event', async () => {
      const result = { id: '1', documentId: 'doc-abc' }
      vi.mocked(mockDocumentService.unpublish).mockResolvedValue(result as never)
      vi.mocked(mockEventService.emit).mockResolvedValue(undefined)

      await service.unpublish('cat', 'doc-abc', 'en')
      expect(mockEventService.emit).toHaveBeenCalledWith(
        'content.unpublished',
        { schema: 'cat', documentId: 'doc-abc', locale: 'en' },
        undefined,
      )
    })
  })

  // ─── delete ────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should delete document and emit content.deleted event', async () => {
      vi.mocked(mockDocumentService.delete).mockResolvedValue(true as never)
      vi.mocked(mockEventService.emit).mockResolvedValue(undefined)

      const result = await service.delete('cat', 'doc-abc')
      expect(result).toBe(true)
      expect(mockEventService.emit).toHaveBeenCalledWith(
        'content.deleted',
        { schema: 'cat', documentId: 'doc-abc' },
        undefined,
      )
    })
  })

  // ─── getVersions ────────────────────────────────────────────────────────

  describe('getVersions', () => {
    it('should use findVersionsByLocale when locale provided', async () => {
      vi.mocked(mockHistoryService.findVersionsByLocale).mockResolvedValue([])
      await service.getVersions('cat', 'doc-abc', 'en')
      expect(mockHistoryService.findVersionsByLocale).toHaveBeenCalledWith('doc-abc', 'cat', 'en')
    })

    it('should use findVersions when no locale provided', async () => {
      vi.mocked(mockHistoryService.findVersions).mockResolvedValue([])
      await service.getVersions('cat', 'doc-abc')
      expect(mockHistoryService.findVersions).toHaveBeenCalledWith('doc-abc', 'cat')
    })
  })
})
