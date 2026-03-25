/**
 * Sidebar active state logic tests.
 *
 * Tests the isNavItemActive pure function exported from AuthedLayout,
 * used for navSecurity, navDeveloper, and navSecondary items.
 *
 * React hook/router integration is covered in apps/e2e/tests/ui/.
 */
import { describe, expect, it } from 'vitest'

import { isNavItemActive } from '../AuthedLayout'

describe('isNavItemActive — sidebar active state predicate', () => {
  describe('navSecurity items', () => {
    it('marks /users active on exact match', () => {
      expect(isNavItemActive('/users', '/users')).toBe(true)
    })

    it('marks /users active on sub-path', () => {
      expect(isNavItemActive('/users', '/users/123')).toBe(true)
    })

    it('does not mark /users active on unrelated path', () => {
      expect(isNavItemActive('/users', '/api-keys')).toBe(false)
    })

    it('marks /access-control active on exact match', () => {
      expect(isNavItemActive('/access-control', '/access-control')).toBe(true)
    })

    it('marks /access-control active on sub-path (role detail)', () => {
      expect(isNavItemActive('/access-control', '/access-control/admin')).toBe(true)
    })

    it('does not match /access-control-extra (prefix guard)', () => {
      expect(isNavItemActive('/access-control', '/access-control-extra')).toBe(false)
    })
  })

  describe('navDeveloper items', () => {
    it('marks /api-keys active on exact match', () => {
      expect(isNavItemActive('/api-keys', '/api-keys')).toBe(true)
    })

    it('marks /vault active on exact match', () => {
      expect(isNavItemActive('/vault', '/vault')).toBe(true)
    })

    it('marks /webhooks active on exact match', () => {
      expect(isNavItemActive('/webhooks', '/webhooks')).toBe(true)
    })

    it('marks /activity active on exact match', () => {
      expect(isNavItemActive('/activity', '/activity')).toBe(true)
    })

    it('does not mark /vault active when on /activity', () => {
      expect(isNavItemActive('/vault', '/activity')).toBe(false)
    })
  })

  describe('navSecondary Settings item', () => {
    it('marks /settings active on exact match', () => {
      expect(isNavItemActive('/settings', '/settings')).toBe(true)
    })

    it('marks /settings active on sub-path (profile, group)', () => {
      expect(isNavItemActive('/settings', '/settings/profile')).toBe(true)
      expect(isNavItemActive('/settings', '/settings/general')).toBe(true)
    })

    it('does not mark /settings active on root', () => {
      expect(isNavItemActive('/settings', '/')).toBe(false)
    })
  })
})
