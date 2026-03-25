import { SETTING_METADATA_KEY } from '~/constants'

export function Setting(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(SETTING_METADATA_KEY, true, target)
  }
}
