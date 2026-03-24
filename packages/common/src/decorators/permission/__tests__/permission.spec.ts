import 'reflect-metadata'
import { describe, expect, it } from 'vitest'

import {
	PERMISSION_METADATA_KEY,
	PERMISSION_OPTIONS_METADATA_KEY,
} from '../../../constants'
import {
	HasPermission,
	PermissionMeta,
	RequirePermission,
	getPermissionMetadata,
	hasPermissionDecorator,
} from '../permission.decorator'

describe('RequirePermission', () => {
	it('stores full PermissionOptions on descriptor.value', () => {
		class PermA {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			PermA.prototype,
			'method',
		)!
		RequirePermission({
			id: 'content.posts.create',
			name: 'Create Posts',
			description: 'Create blog posts',
			group: 'Content',
		})(PermA.prototype, 'method', descriptor)
		const metadata = Reflect.getMetadata(
			PERMISSION_METADATA_KEY,
			descriptor.value,
		)
		expect(metadata).toBeDefined()
		expect(metadata.id).toBe('content.posts.create')
		expect(metadata.name).toBe('Create Posts')
		expect(metadata.description).toBe('Create blog posts')
		expect(metadata.group).toBe('Content')
	})

	it('stores metadata via class decorator syntax', () => {
		class PermB {
			@RequirePermission({ id: 'admin.users.read', name: 'Read Users' })
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			PermB.prototype,
			'method',
		)!
		const metadata = Reflect.getMetadata(
			PERMISSION_METADATA_KEY,
			descriptor.value,
		)
		expect(metadata).toBeDefined()
		expect(metadata.id).toBe('admin.users.read')
	})

	it('returns the original descriptor', () => {
		class PermC {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			PermC.prototype,
			'method',
		)!
		const result = RequirePermission({ id: 'test.permission', name: 'Test' })(
			PermC.prototype,
			'method',
			descriptor,
		)
		expect(result).toBe(descriptor)
	})
})

describe('HasPermission', () => {
	it('auto-generates name from last segment of permission string', () => {
		class HasPermD {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			HasPermD.prototype,
			'method',
		)!
		HasPermission('admin.users.read')(HasPermD.prototype, 'method', descriptor)
		const metadata = Reflect.getMetadata(
			PERMISSION_METADATA_KEY,
			descriptor.value,
		)
		expect(metadata).toBeDefined()
		expect(metadata.id).toBe('admin.users.read')
		expect(metadata.name).toBe('read')
	})

	it('auto-generates description from permission string', () => {
		class HasPermE {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			HasPermE.prototype,
			'method',
		)!
		HasPermission('content.posts.create')(
			HasPermE.prototype,
			'method',
			descriptor,
		)
		const metadata = Reflect.getMetadata(
			PERMISSION_METADATA_KEY,
			descriptor.value,
		)
		expect(metadata.description).toBe(
			'Requires content.posts.create permission',
		)
	})

	it('uses full permission as name when no dots present', () => {
		class HasPermF {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			HasPermF.prototype,
			'method',
		)!
		HasPermission('simplepermission')(HasPermF.prototype, 'method', descriptor)
		const metadata = Reflect.getMetadata(
			PERMISSION_METADATA_KEY,
			descriptor.value,
		)
		expect(metadata.name).toBe('simplepermission')
	})
})

describe('PermissionMeta', () => {
	it('stores partial options under PERMISSION_OPTIONS_METADATA_KEY', () => {
		class PermMetaG {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			PermMetaG.prototype,
			'method',
		)!
		PermissionMeta({ group: 'Admin' })(
			PermMetaG.prototype,
			'method',
			descriptor,
		)
		const metadata = Reflect.getMetadata(
			PERMISSION_OPTIONS_METADATA_KEY,
			descriptor.value,
		)
		expect(metadata).toBeDefined()
		expect(metadata.group).toBe('Admin')
	})

	it('stores description-only options', () => {
		class PermMetaH {
			method() {}
		}
		const descriptor = Object.getOwnPropertyDescriptor(
			PermMetaH.prototype,
			'method',
		)!
		PermissionMeta({ description: 'Extra description' })(
			PermMetaH.prototype,
			'method',
			descriptor,
		)
		const metadata = Reflect.getMetadata(
			PERMISSION_OPTIONS_METADATA_KEY,
			descriptor.value,
		)
		expect(metadata.description).toBe('Extra description')
	})
})

describe('getPermissionMetadata', () => {
	it('returns undefined for undecorated methods', () => {
		class GetPermI {
			method() {}
		}
		const result = getPermissionMetadata(GetPermI.prototype, 'method')
		expect(result).toBeUndefined()
	})

	it('returns stored options when method is decorated', () => {
		class GetPermJ {
			@RequirePermission({ id: 'test.read', name: 'Test Read' })
			method() {}
		}
		// The fixed getPermissionMetadata reads target[propertyKey] (i.e., descriptor.value) and then
		// calls Reflect.getMetadata on that function — the same object SetMetadata stored metadata on.
		const result = getPermissionMetadata(GetPermJ.prototype, 'method')
		expect(result).toBeDefined()
		expect(result!.id).toBe('test.read')
	})
})

describe('hasPermissionDecorator', () => {
	it('returns false for undecorated methods', () => {
		class HasDecK {
			method() {}
		}
		expect(hasPermissionDecorator(HasDecK.prototype, 'method')).toBe(false)
	})

	it('returns true for methods decorated with RequirePermission', () => {
		class HasDecL {
			@RequirePermission({ id: 'test.write', name: 'Test Write' })
			method() {}
		}
		expect(hasPermissionDecorator(HasDecL.prototype, 'method')).toBe(true)
	})

	it('returns true for methods decorated with HasPermission', () => {
		class HasDecM {
			@HasPermission('test.delete')
			method() {}
		}
		expect(hasPermissionDecorator(HasDecM.prototype, 'method')).toBe(true)
	})
})
