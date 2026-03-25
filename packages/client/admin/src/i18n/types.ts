import type messages from './messages/en.json'

/**
 * Union type of all message IDs in the default locale catalog.
 * This enables type-safe message lookups via useAppIntl().
 */
export type MessageId = keyof typeof messages

/**
 * Typed message descriptor for use with intl.formatMessage()
 */
export interface TypedMessageDescriptor {
  id: MessageId
  defaultMessage: string
  description?: string
}
