import { describe, expect, it } from 'vitest'

import { getSchemaToken, getSettingToken } from '../get-schema-token.util'

describe('getSchemaToken', () => {
  it('returns ClassName + Schema', () => {
    class Article {}
    expect(getSchemaToken(Article)).toBe('ArticleSchema')
  })

  it('works with multi-word class names', () => {
    class BlogPost {}
    expect(getSchemaToken(BlogPost)).toBe('BlogPostSchema')
  })
})

describe('getSettingToken', () => {
  it('returns ClassName + Setting', () => {
    class AppSetting {}
    expect(getSettingToken(AppSetting)).toBe('AppSettingSetting')
  })
})
