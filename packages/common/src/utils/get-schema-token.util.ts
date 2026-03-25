import { Type } from '@nestjs/common'

export const getSchemaToken = (schema: Type): string => {
  return `${schema.name}Schema`
}

export const getSettingToken = (setting: Type): string => {
  return `${setting.name}Setting`
}
