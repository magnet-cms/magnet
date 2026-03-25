import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { Request } from 'express'

import { StorageService } from '../storage.service'

import { WILDCARD_PERMISSION } from '~/modules/rbac/rbac.constants'
import { RoleService } from '~/modules/rbac/services/role.service'

interface AuthenticatedRequest extends Request {
  user?: { id: string; role?: string }
  params: Record<string, string>
}

/**
 * MediaOwnerGuard enforces per-file ownership access control.
 *
 * Access logic:
 * 1. Media not found → allow (controller handles 404)
 * 2. Media has no ownerId → allow (public / backward-compat)
 * 3. Media has ownerId → require authenticated user who is either:
 *    a. The owner (user.id === media.ownerId), OR
 *    b. An admin (has wildcard permission)
 *
 * Apply after OptionalDynamicAuthGuard so req.user is populated when
 * a valid token is present.
 *
 * @example
 * ```typescript
 * @Get(':id')
 * @UseGuards(OptionalDynamicAuthGuard, MediaOwnerGuard)
 * async get(@Param('id') id: string) { ... }
 * ```
 */
@Injectable()
export class MediaOwnerGuard implements CanActivate {
  constructor(
    private readonly storageService: StorageService,
    private readonly roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const mediaId = request.params.id

    if (!mediaId) return true

    const media = await this.storageService.findById(mediaId)

    // Media not found — let the controller return 404
    if (!media) return true

    // No owner restriction — public or backward-compat media
    if (!media.ownerId) return true

    const user = request.user

    if (!user) {
      throw new ForbiddenException('Authentication required to access this media')
    }

    // Owner can always access their own media
    if (user.id === media.ownerId) return true

    // Admins have full access
    const isAdmin = await this.roleService.hasPermission(user.id, WILDCARD_PERMISSION)
    if (isAdmin) return true

    throw new ForbiddenException('You do not have access to this media')
  }
}
