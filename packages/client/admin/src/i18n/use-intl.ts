import { useIntl } from 'react-intl'

import type { MessageId } from './types'

interface TypedFormatMessageDescriptor {
  id: MessageId
  defaultMessage: string
  description?: string
}

interface TypedIntl extends Omit<ReturnType<typeof useIntl>, 'formatMessage'> {
  formatMessage: (
    descriptor: TypedFormatMessageDescriptor,
    values?: Record<string, string | number | boolean | Date | undefined>,
  ) => string
}

/**
 * Typed wrapper around useIntl() that restricts message IDs
 * to those defined in en.json, providing autocomplete and
 * compile-time checking for message IDs.
 */
export function useAppIntl(): TypedIntl {
  return useIntl() as unknown as TypedIntl
}
