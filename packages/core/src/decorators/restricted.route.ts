import { SetMetadata } from '@nestjs/common'

export const IS_RESTRICTED_ROUTE = 'IS_RESTRICTED_ROUTE'

export function RestrictedRoute() {
  return SetMetadata(IS_RESTRICTED_ROUTE, true)
}
