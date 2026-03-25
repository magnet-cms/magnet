import { UI_METADATA_KEY } from '~/constants'
import { UIDecoratorOptions } from '~/types'

export interface UIFieldMetadata {
  propertyKey: string | symbol

  options: UIDecoratorOptions & { designType: Function }
}

export function UI(options: UIDecoratorOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    const designType: Function = Reflect.getMetadata('design:type', target, propertyKey)
    const existingUIFields: UIFieldMetadata[] = Reflect.getMetadata(UI_METADATA_KEY, target) || []

    Reflect.defineMetadata(
      UI_METADATA_KEY,
      [...existingUIFields, { propertyKey, options: { ...options, designType } }],
      target,
    )
  }
}
