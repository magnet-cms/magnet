import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'

vi.mock('~/utils/detect-adapter.util', () => ({
  detectDatabaseAdapter: () => 'mongoose',
  setDatabaseAdapter: vi.fn(),
  clearAdapterCache: vi.fn(),
}))

const adapterInjectModel = vi.fn(() => () => {})

vi.mock('~/utils/database-adapter-module.util', () => ({
  requireDatabaseAdapterModule: () => ({
    Prop: () => () => {},
    Schema: () => () => {},
    InjectModel: adapterInjectModel,
  }),
  getDatabaseAdapterResolutionRoots: () => [],
}))

import { INJECT_MODEL } from '../../constants'
import { InjectModel } from '../inject.decorator'

class UserModel {}

describe('InjectModel', () => {
  it('stores model in INJECT_MODEL metadata via (target, propertyKey) for method params', () => {
    class InjectA {
      method(@InjectModel(UserModel) _model: unknown) {}
    }
    const metadata = Reflect.getMetadata(INJECT_MODEL, InjectA.prototype, 'method')
    expect(metadata).toBe(UserModel)
  })

  it('does not store metadata when propertyKey is undefined (constructor params)', () => {
    // Manually simulate the decorator with propertyKey = undefined
    const cls = class InjectB {}
    InjectModel(UserModel)(cls, undefined, 0)
    // Metadata must NOT be stored on the constructor target when propertyKey is undefined
    expect(Reflect.getMetadata(INJECT_MODEL, cls)).toBeUndefined()
  })

  it('delegates to the adapter InjectModel', () => {
    class InjectC {
      method(@InjectModel(UserModel) _model: unknown) {}
    }
    // Verify adapterInjectModel was called with the model
    expect(adapterInjectModel).toHaveBeenCalledWith(UserModel)
    void InjectC // suppress unused variable warning
  })

  it('metadata is retrievable via three-arg Reflect.getMetadata', () => {
    class InjectD {
      method(@InjectModel(UserModel) _model: unknown) {}
    }
    // Three-arg form: getMetadata(KEY, target, propertyKey)
    const result = Reflect.getMetadata(INJECT_MODEL, InjectD.prototype, 'method')
    expect(result).toBe(UserModel)

    // Two-arg form does NOT return the metadata (different storage key)
    const resultTwoArg = Reflect.getMetadata(INJECT_MODEL, InjectD.prototype)
    expect(resultTwoArg).toBeUndefined()
  })

  it('stores the exact model reference', () => {
    class AnotherModel {}
    class InjectE {
      method(@InjectModel(AnotherModel) _model: unknown) {}
    }
    const metadata = Reflect.getMetadata(INJECT_MODEL, InjectE.prototype, 'method')
    expect(metadata).toBe(AnotherModel)
    expect(metadata).not.toBe(UserModel)
  })
})
