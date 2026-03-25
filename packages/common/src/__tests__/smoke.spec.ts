import { describe, expect, it } from 'vitest'

import { FIELD_METADATA_KEY } from '../constants'
import { Field, getFieldMetadata } from '../decorators/field'

describe('smoke test: @magnet-cms/common', () => {
  it('exports Field namespace', () => {
    expect(Field).toBeDefined()
    expect(Field.Text).toBeTypeOf('function')
  })

  it('exports getFieldMetadata utility', () => {
    expect(getFieldMetadata).toBeTypeOf('function')
  })

  it('exports FIELD_METADATA_KEY constant', () => {
    expect(FIELD_METADATA_KEY).toBe('magnet:schema:field')
  })
})
