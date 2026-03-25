import { randomUUID } from 'node:crypto'

export const testData = {
  user: {
    email: () => `test-${randomUUID().slice(0, 8)}@example.com`,
    password: () => 'TestPassword123!',
    name: () => `Test User ${randomUUID().slice(0, 4)}`,
    role: () => 'admin',
    create: (
      overrides?: Partial<{
        email: string
        password: string
        name: string
        role: string
      }>,
    ) => ({
      email: overrides?.email ?? `test-${randomUUID().slice(0, 8)}@example.com`,
      password: overrides?.password ?? 'TestPassword123!',
      name: overrides?.name ?? `Test User ${randomUUID().slice(0, 4)}`,
      role: overrides?.role ?? 'admin',
    }),
  },

  owner: {
    create: (
      overrides?: Partial<{
        name: string
        email: string
        phone: string
        address?: string
      }>,
    ) => {
      // Phone must be 10-20 characters
      const phoneBase = `+1-555-${Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0')}`
      const phone = overrides?.phone ?? phoneBase

      return {
        name: overrides?.name ?? `Test Owner ${randomUUID().slice(0, 8)}`,
        email: overrides?.email ?? `owner-${randomUUID().slice(0, 8)}@example.com`,
        phone: phone.length >= 10 && phone.length <= 20 ? phone : phoneBase,
        address: overrides?.address,
      }
    },
  },

  cat: {
    create: (
      overrides?: Partial<{
        tagID: string
        name: string
        birthdate: Date
        breed: string
        weight: number
        owner: string
        castrated: boolean
        description?: string
      }>,
    ) => {
      const now = new Date()
      const birthdate =
        overrides?.birthdate ??
        new Date(
          now.getFullYear() - Math.floor(Math.random() * 15) - 1,
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28) + 1,
        )

      // tagID must be 10-20 characters (Length(10, 20) validator)
      // "TAG-" is 4 chars, so we need 6-16 more chars to get 10-20 total
      const defaultTagID = `TAG-${randomUUID().slice(0, 12).toUpperCase()}` // 4 + 12 = 16 chars
      const tagID = overrides?.tagID ?? defaultTagID

      // Validate tagID length
      const validTagID = tagID.length >= 10 && tagID.length <= 20 ? tagID : defaultTagID

      return {
        tagID: validTagID,
        name: overrides?.name ?? `TestCat-${randomUUID().slice(0, 8)}`,
        birthdate,
        breed: overrides?.breed ?? 'Domestic Shorthair',
        weight: overrides?.weight ?? Number((Math.random() * 14.5 + 0.5).toFixed(2)), // Between 0.5 and 15, rounded to 2 decimals
        owner: overrides?.owner ?? '',
        castrated: overrides?.castrated ?? false,
        description: overrides?.description,
      }
    },
  },

  veterinarian: {
    create: (
      overrides?: Partial<{
        name: string
        clinic: string
        licenseNumber: string
        specialization?: string
      }>,
    ) => {
      // License number must be 5-50 characters
      const defaultLicense = `VET-${randomUUID().slice(0, 12).toUpperCase()}`

      return {
        name: overrides?.name ?? `Dr. ${randomUUID().slice(0, 8)}`,
        clinic: overrides?.clinic ?? `Test Clinic ${randomUUID().slice(0, 6)}`,
        licenseNumber: overrides?.licenseNumber ?? defaultLicense,
        specialization: overrides?.specialization,
      }
    },
  },

  content: {
    create: (
      schema: string,
      overrides?: Partial<Record<string, unknown>>,
    ): Record<string, unknown> => {
      const base: Record<string, unknown> = {
        title: `Test ${schema} ${randomUUID().slice(0, 8)}`,
        ...overrides,
      }
      return base
    },
  },

  media: {
    filename: () => `test-${randomUUID().slice(0, 8)}.png`,
    folder: () => `test-folder-${randomUUID().slice(0, 6)}`,
    tags: (count = 2) => {
      const tags: string[] = []
      for (let i = 0; i < count; i++) {
        tags.push(`tag-${randomUUID().slice(0, 4)}`)
      }
      return tags
    },
    alt: () => `Test image ${randomUUID().slice(0, 6)}`,
  },

  settings: {
    create: (
      group: string,
      overrides?: Partial<Record<string, unknown>>,
    ): Record<string, unknown> => {
      const base: Record<string, unknown> = {
        ...overrides,
      }
      return base
    },
  },
}

export function testId(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`
}
