import 'reflect-metadata'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('~/utils/detect-adapter.util', () => ({
  detectDatabaseAdapter: () => 'mongoose',
  setDatabaseAdapter: vi.fn(),
  clearAdapterCache: vi.fn(),
}))

vi.mock('~/utils/database-adapter-module.util', () => ({
  requireDatabaseAdapterModule: () => ({
    Prop: () => () => {},
    Schema: () => () => {},
  }),
  getDatabaseAdapterResolutionRoots: () => [],
}))

import { getFieldMetadataForProperty } from '../field.factory'
import { Field } from '../index'

import type { FileFieldOptions, GalleryFieldOptions, ImageFieldOptions } from '~/types/field.types'
import { clearAdapterCache } from '~/utils/detect-adapter.util'

afterEach(() => {
  vi.mocked(clearAdapterCache)()
})

describe('Field.Image', () => {
  it('stores type image', () => {
    class MediaImgA {
      @Field.Image()
      cover!: string
    }
    const f = getFieldMetadataForProperty(MediaImgA, 'cover')!
    expect(f.type).toBe('image')
  })

  it('stores folder option', () => {
    class MediaImgB {
      @Field.Image({ folder: 'covers' })
      thumbnail!: string
    }
    const f = getFieldMetadataForProperty(MediaImgB, 'thumbnail')!
    expect((f.options as ImageFieldOptions).folder).toBe('covers')
  })
})

describe('Field.File', () => {
  it('stores type file', () => {
    class MediaFileA {
      @Field.File()
      attachment!: string
    }
    const f = getFieldMetadataForProperty(MediaFileA, 'attachment')!
    expect(f.type).toBe('file')
  })

  it('stores folder and accept options', () => {
    class MediaFileB {
      @Field.File({ folder: 'documents', accept: ['application/pdf'] })
      doc!: string
    }
    const f = getFieldMetadataForProperty(MediaFileB, 'doc')!
    expect((f.options as FileFieldOptions).folder).toBe('documents')
    expect((f.options as FileFieldOptions).accept).toEqual(['application/pdf'])
  })
})

describe('Field.Gallery', () => {
  it('stores type gallery', () => {
    class MediaGalleryA {
      @Field.Gallery()
      images!: string[]
    }
    const f = getFieldMetadataForProperty(MediaGalleryA, 'images')!
    expect(f.type).toBe('gallery')
  })

  it('stores maxItems option', () => {
    class MediaGalleryB {
      @Field.Gallery({ maxItems: 10 })
      photos!: string[]
    }
    const f = getFieldMetadataForProperty(MediaGalleryB, 'photos')!
    expect((f.options as GalleryFieldOptions).maxItems).toBe(10)
  })
})
