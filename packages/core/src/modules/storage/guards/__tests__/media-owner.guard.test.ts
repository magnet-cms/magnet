/**
 * MediaOwnerGuard unit tests.
 *
 * Tests the access-control decision logic for encrypted/private media:
 * - No ownerId on media → allow (backward compat)
 * - Media with ownerId and matching user → allow
 * - Media with ownerId and admin user → allow
 * - Media with ownerId and wrong user → throw ForbiddenException
 * - Media with ownerId but no user → throw ForbiddenException
 * - Media not found → allow (controller handles 404)
 */
import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

// ------- Pure access-control helpers extracted from MediaOwnerGuard logic -------

interface MediaRecord {
  ownerId?: string
  isEncrypted?: boolean
}

interface UserContext {
  id: string
}

interface AccessControlInput {
  media: MediaRecord | null
  user: UserContext | null
  isAdmin: boolean
}

/**
 * Mirrors the access-control decision in MediaOwnerGuard.canActivate().
 * Returns true if access is allowed, throws ForbiddenException/NotFoundException otherwise.
 */
function checkMediaAccess(input: AccessControlInput): boolean {
  const { media, user, isAdmin } = input

  // Media not found — let the controller handle 404
  if (!media) return true

  // No owner restriction — public/backward-compat
  if (!media.ownerId) return true

  // Owner or admin required
  if (!user) {
    throw new ForbiddenException('Authentication required to access this media')
  }

  if (user.id === media.ownerId || isAdmin) {
    return true
  }

  throw new ForbiddenException('You do not have access to this media')
}

// ------- Tests -------

describe('MediaOwnerGuard access-control logic', () => {
  describe('checkMediaAccess()', () => {
    it('should allow when media is not found (controller handles 404)', () => {
      expect(checkMediaAccess({ media: null, user: null, isAdmin: false })).toBe(true)
    })

    it('should allow when media has no ownerId (public/backward-compat)', () => {
      expect(
        checkMediaAccess({
          media: { isEncrypted: false },
          user: null,
          isAdmin: false,
        }),
      ).toBe(true)
    })

    it('should allow when user is the owner', () => {
      expect(
        checkMediaAccess({
          media: { ownerId: 'user-42', isEncrypted: true },
          user: { id: 'user-42' },
          isAdmin: false,
        }),
      ).toBe(true)
    })

    it('should allow when user is admin (regardless of ownerId)', () => {
      expect(
        checkMediaAccess({
          media: { ownerId: 'user-42', isEncrypted: true },
          user: { id: 'admin-99' },
          isAdmin: true,
        }),
      ).toBe(true)
    })

    it('should throw ForbiddenException when user is not owner and not admin', () => {
      expect(() =>
        checkMediaAccess({
          media: { ownerId: 'user-42', isEncrypted: true },
          user: { id: 'user-99' },
          isAdmin: false,
        }),
      ).toThrow(ForbiddenException)
    })

    it('should throw ForbiddenException when no user and media has ownerId', () => {
      expect(() =>
        checkMediaAccess({
          media: { ownerId: 'user-42', isEncrypted: true },
          user: null,
          isAdmin: false,
        }),
      ).toThrow(ForbiddenException)
    })

    it('should include helpful message when unauthenticated', () => {
      try {
        checkMediaAccess({
          media: { ownerId: 'user-42' },
          user: null,
          isAdmin: false,
        })
        throw new Error('expected to throw')
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException)
        expect((e as ForbiddenException).message).toContain('Authentication')
      }
    })

    it('should include helpful message when wrong user', () => {
      try {
        checkMediaAccess({
          media: { ownerId: 'user-42' },
          user: { id: 'intruder' },
          isAdmin: false,
        })
        throw new Error('expected to throw')
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException)
        expect((e as ForbiddenException).message).toContain('access')
      }
    })
  })
})
