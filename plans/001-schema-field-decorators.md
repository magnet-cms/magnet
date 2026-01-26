# Plan 001: Schema & Field Decorator System

**Status:** ✅ Completed
**Priority:** High
**Estimated Effort:** 4 weeks
**Depends on:** Plan 000 (Type Safety Remediation)

---

## Summary

Refactor Magnet CMS to introduce a unified decorator-based Schema and Field system that combines `@Prop` and `@UI` into semantic field decorators. Validation remains explicit using class-validator via `@Field.Validators()`.

---

## Problem Statement

### Current Pattern (Verbose)
```typescript
@Schema()
export class Cat {
  @Prop({ required: true, unique: true })
  @Validators(IsString(), Length(1, 200), IsNotEmpty())
  @UI({ tab: 'General', type: 'text', description: 'Cat name' })
  name: string
}
```

### Issues
1. **3 decorators per field** - Too verbose
2. **Redundant type specification** - `@Prop` and `@UI` both need type info
3. **No semantic meaning** - `@Prop({ type: String }) @UI({ type: 'email' })` vs `@Field.Email()`

---

## Proposed Solution

### New Pattern (Unified)
```typescript
@Schema({ slug: 'cats' })
export class Cat {
  @Field.Text({ required: true, unique: true, tab: 'General' })
  @Field.Validators(IsString(), Length(1, 200), IsNotEmpty())
  name: string

  @Field.Email({ required: true })
  @Field.Validators(IsEmail(), IsNotEmpty())
  authorEmail: string

  @Field.RichText({ toolbar: 'full' })
  @Field.Validators(IsOptional())
  content?: string
}
```

**Key Change**: Validation remains explicit via `@Field.Validators()` using class-validator decorators. Field decorators handle `@Prop` + `@UI` mapping only.

### Field Decorator Namespace

```typescript
// Primitives
@Field.Text({ required?, minLength?, maxLength?, pattern? })
@Field.Number({ min?, max?, integer?, default? })
@Field.Boolean({ default?, style?: 'switch' | 'checkbox' })
@Field.Date({ min?, max?, default? })
@Field.DateTime({ timezone? })

// Rich Content
@Field.RichText({ toolbar?: 'minimal' | 'standard' | 'full' })
@Field.Markdown({ preview?: boolean })
@Field.Code({ language?: string })
@Field.JSON({ schema?: ZodSchema })

// Selection
@Field.Select({ options, default?, multiple? })
@Field.Enum({ enum: EnumType, multiple? })
@Field.Tags({ suggestions?: string[], maxTags? })

// Media
@Field.Image({ folder?, maxSize?, formats? })
@Field.File({ folder?, maxSize?, accept? })
@Field.Gallery({ maxItems? })

// Special
@Field.Slug({ from: string, unique?: boolean })
@Field.Email()
@Field.URL()
@Field.Phone({ defaultCountry? })
@Field.Address({ provider?: 'google' | 'mapbox' })
@Field.Color({ format?: 'hex' | 'rgb' })

// Composition
@Field.Object({ schema: ZodSchema })
@Field.Array({ of: FieldType, minItems?, maxItems? })
@Field.Blocks({ types: BlockType[] })
@Field.Relationship({ ref: string, multiple? })
```

---

## Additional Features

### 1. User Extension Pattern

```typescript
@ExtendUser()
export class User {
  // Base fields inherited: id, email, password, role, createdAt, updatedAt

  @Field.Text({ required: true })
  @Field.Validators(IsString(), Length(1, 50), IsNotEmpty())
  firstName: string

  @Field.Text({ required: true })
  @Field.Validators(IsString(), Length(1, 50), IsNotEmpty())
  lastName: string

  @Field.Image({ folder: 'avatars' })
  @Field.Validators(IsOptional())
  avatar?: string

  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }
}
```

### 2. Settings System

```typescript
@Settings({ group: 'general', label: 'General Settings', icon: 'settings' })
export class GeneralSettings {
  @Setting.Text({ label: 'Site Name', required: true })
  siteName: string = 'My Site'

  @Setting.Image({ label: 'Logo' })
  logo?: string

  @Setting.Boolean({ label: 'Maintenance Mode' })
  maintenanceMode: boolean = false
}

@Settings({ group: 'email', label: 'Email Settings', icon: 'mail' })
export class EmailSettings {
  @Setting.Select({ label: 'Provider', options: ['smtp', 'sendgrid', 'resend'] })
  provider: string = 'smtp'

  @Setting.Secret({ label: 'API Key' })  // Encrypted in DB, masked in UI
  apiKey?: string
}
```

---

## Architecture

### Metadata Flow

```
@Field.Email({ required: true })
@Field.Validators(IsEmail(), IsNotEmpty())
        │
        ▼
┌─────────────────────────────────────────┐
│  createFieldDecorator('email', opts)    │
└─────────────────────────────────────────┘
        │
        ├──► Store FIELD_METADATA_KEY (new)
        │
        ├──► Store PROP_METADATA_KEY (legacy compat)
        │
        ├──► Store UI_METADATA_KEY (legacy compat)
        │
        └──► Apply adapter-specific Prop decorator

┌─────────────────────────────────────────┐
│  Field.Validators(IsEmail(), ...)       │
└─────────────────────────────────────────┘
        │
        └──► Apply class-validator decorators (unchanged behavior)
```

**Note**: `@Field.Validators()` is simply an alias for the existing `@Validators()` decorator, keeping validation explicit and using familiar class-validator syntax.

### Discovery Integration

```
MetadataExtractorService.extractSchemaMetadata()
        │
        ├──► Check FIELD_METADATA_KEY
        │        │
        │        ├─ Found? → Map to SchemaProperty
        │        │
        │        └─ Not found? → Fall back to legacy
        │
        └──► Return SchemaMetadata for admin UI
```

---

## Type Safety Requirements

This plan MUST adhere to strict type safety. All implementations must follow these patterns.

### Field Options Type Definitions

```typescript
// packages/common/src/types/field.types.ts

import type { Type } from '@nestjs/common'

/**
 * Base options shared by all field decorators
 */
export interface BaseFieldOptions {
  /** Field is required */
  required?: boolean
  /** Field must be unique */
  unique?: boolean
  /** Default value */
  default?: unknown
  /** Admin UI tab placement */
  tab?: string
  /** Admin UI group within tab */
  group?: string
  /** Field label in admin UI */
  label?: string
  /** Field description/help text */
  description?: string
  /** Field placeholder text */
  placeholder?: string
  /** Hide field in admin UI */
  hidden?: boolean
  /** Make field read-only in admin UI */
  readonly?: boolean
  /** Field display order */
  order?: number
}

/**
 * Text field options
 */
export interface TextFieldOptions extends BaseFieldOptions {
  minLength?: number
  maxLength?: number
  pattern?: string
  transform?: 'none' | 'lowercase' | 'uppercase' | 'trim'
}

/**
 * Number field options
 */
export interface NumberFieldOptions extends BaseFieldOptions {
  min?: number
  max?: number
  integer?: boolean
  step?: number
}

/**
 * Boolean field options
 */
export interface BooleanFieldOptions extends BaseFieldOptions {
  default?: boolean
  style?: 'switch' | 'checkbox'
}

/**
 * Date/DateTime field options
 */
export interface DateFieldOptions extends BaseFieldOptions {
  min?: Date | string
  max?: Date | string
  default?: Date | string | 'now'
}

export interface DateTimeFieldOptions extends DateFieldOptions {
  timezone?: string
}

/**
 * Rich text field options
 */
export interface RichTextFieldOptions extends BaseFieldOptions {
  toolbar?: 'minimal' | 'standard' | 'full'
  maxLength?: number
}

/**
 * Select field options
 */
export interface SelectFieldOptions<T extends string | number = string> extends BaseFieldOptions {
  options: ReadonlyArray<{ label: string; value: T }> | ReadonlyArray<T>
  default?: T
  multiple?: boolean
}

/**
 * Enum field options - generic preserves enum type
 */
export interface EnumFieldOptions<E extends Record<string, string | number>> extends BaseFieldOptions {
  enum: E
  default?: E[keyof E]
  multiple?: boolean
}

/**
 * Relationship field options
 */
export interface RelationshipFieldOptions extends BaseFieldOptions {
  /** Reference schema name */
  ref: string
  /** Allow multiple selections */
  multiple?: boolean
  /** Fields to display in selection */
  displayFields?: string[]
}

/**
 * Image field options
 */
export interface ImageFieldOptions extends BaseFieldOptions {
  folder?: string
  maxSize?: number
  formats?: ReadonlyArray<'jpg' | 'jpeg' | 'png' | 'gif' | 'webp' | 'svg'>
  dimensions?: {
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
  }
}

/**
 * File field options
 */
export interface FileFieldOptions extends BaseFieldOptions {
  folder?: string
  maxSize?: number
  accept?: string[]
}

/**
 * Slug field options
 */
export interface SlugFieldOptions extends BaseFieldOptions {
  /** Field to generate slug from */
  from: string
  unique?: boolean
}

/**
 * JSON field options
 */
export interface JSONFieldOptions extends BaseFieldOptions {
  /** Zod schema for validation */
  schema?: unknown // ZodSchema type
}

/**
 * Array field options - generic preserves item type
 */
export interface ArrayFieldOptions<T = unknown> extends BaseFieldOptions {
  of: FieldType<T>
  minItems?: number
  maxItems?: number
}

/**
 * Field type definition for array items
 */
export type FieldType<T = unknown> =
  | { type: 'text'; options?: TextFieldOptions }
  | { type: 'number'; options?: NumberFieldOptions }
  | { type: 'boolean'; options?: BooleanFieldOptions }
  | { type: 'date'; options?: DateFieldOptions }
  | { type: 'relationship'; options?: RelationshipFieldOptions }
  | { type: 'custom'; decorator: PropertyDecorator }

/**
 * Field metadata stored via reflection
 */
export interface FieldMetadata<T extends BaseFieldOptions = BaseFieldOptions> {
  /** Field type identifier */
  type: FieldTypeId
  /** Typed options for this field */
  options: T
  /** Property key */
  propertyKey: string | symbol
  /** Target class */
  target: Type<unknown>
}

/**
 * All field type identifiers
 */
export type FieldTypeId =
  | 'text'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'richtext'
  | 'markdown'
  | 'code'
  | 'json'
  | 'select'
  | 'enum'
  | 'tags'
  | 'image'
  | 'file'
  | 'gallery'
  | 'slug'
  | 'email'
  | 'url'
  | 'phone'
  | 'address'
  | 'color'
  | 'object'
  | 'array'
  | 'blocks'
  | 'relationship'
```

### Type-Safe Decorator Factory

```typescript
// packages/common/src/decorators/field/field.factory.ts

import type { FieldTypeId, FieldMetadata, BaseFieldOptions } from '../../types/field.types'
import { FIELD_METADATA_KEY, PROP_METADATA_KEY, UI_METADATA_KEY } from '../../constants'

/**
 * Type-safe field decorator factory
 */
export function createFieldDecorator<T extends BaseFieldOptions>(
  type: FieldTypeId,
  defaultOptions: Partial<T> = {}
): (options?: T) => PropertyDecorator {
  return (options?: T): PropertyDecorator => {
    const mergedOptions = { ...defaultOptions, ...options } as T

    return (target: object, propertyKey: string | symbol): void => {
      // Store typed field metadata
      const metadata: FieldMetadata<T> = {
        type,
        options: mergedOptions,
        propertyKey,
        target: target.constructor as Type<unknown>,
      }

      // Get existing field metadata array or create new
      const existingFields: FieldMetadata[] =
        Reflect.getMetadata(FIELD_METADATA_KEY, target.constructor) ?? []

      Reflect.defineMetadata(
        FIELD_METADATA_KEY,
        [...existingFields, metadata],
        target.constructor
      )

      // Emit legacy metadata for backwards compatibility
      emitLegacyPropMetadata(target, propertyKey, type, mergedOptions)
      emitLegacyUIMetadata(target, propertyKey, type, mergedOptions)
    }
  }
}

/**
 * Map field type to Prop decorator options
 */
function emitLegacyPropMetadata(
  target: object,
  propertyKey: string | symbol,
  type: FieldTypeId,
  options: BaseFieldOptions
): void {
  const propOptions = mapFieldTypeToProp(type, options)

  const existingProps: Map<string | symbol, unknown> =
    Reflect.getMetadata(PROP_METADATA_KEY, target.constructor) ?? new Map()

  existingProps.set(propertyKey, propOptions)
  Reflect.defineMetadata(PROP_METADATA_KEY, existingProps, target.constructor)
}

/**
 * Map field type to UI decorator options
 */
function emitLegacyUIMetadata(
  target: object,
  propertyKey: string | symbol,
  type: FieldTypeId,
  options: BaseFieldOptions
): void {
  const uiOptions = mapFieldTypeToUI(type, options)

  const existingUI: Map<string | symbol, unknown> =
    Reflect.getMetadata(UI_METADATA_KEY, target.constructor) ?? new Map()

  existingUI.set(propertyKey, uiOptions)
  Reflect.defineMetadata(UI_METADATA_KEY, existingUI, target.constructor)
}
```

### Type-Safe Field Namespace

```typescript
// packages/common/src/decorators/field/index.ts

import { createFieldDecorator } from './field.factory'
import type {
  TextFieldOptions,
  NumberFieldOptions,
  BooleanFieldOptions,
  DateFieldOptions,
  DateTimeFieldOptions,
  RichTextFieldOptions,
  SelectFieldOptions,
  EnumFieldOptions,
  RelationshipFieldOptions,
  ImageFieldOptions,
  FileFieldOptions,
  SlugFieldOptions,
  JSONFieldOptions,
  ArrayFieldOptions,
} from '../../types/field.types'
import { Validators as BaseValidators } from '../validators.decorator'

/**
 * Field decorator namespace with full type safety
 */
export const Field = {
  // Primitives
  Text: createFieldDecorator<TextFieldOptions>('text'),
  Number: createFieldDecorator<NumberFieldOptions>('number'),
  Boolean: createFieldDecorator<BooleanFieldOptions>('boolean'),
  Date: createFieldDecorator<DateFieldOptions>('date'),
  DateTime: createFieldDecorator<DateTimeFieldOptions>('datetime'),

  // Rich content
  RichText: createFieldDecorator<RichTextFieldOptions>('richtext'),
  Markdown: createFieldDecorator<RichTextFieldOptions>('markdown'),
  Code: createFieldDecorator<TextFieldOptions & { language?: string }>('code'),
  JSON: createFieldDecorator<JSONFieldOptions>('json'),

  // Selection - generic preserves option value types
  Select: <T extends string | number = string>(options: SelectFieldOptions<T>) =>
    createFieldDecorator<SelectFieldOptions<T>>('select')(options),

  Enum: <E extends Record<string, string | number>>(options: EnumFieldOptions<E>) =>
    createFieldDecorator<EnumFieldOptions<E>>('enum')(options),

  Tags: createFieldDecorator<TextFieldOptions & { suggestions?: string[]; maxTags?: number }>('tags'),

  // Media
  Image: createFieldDecorator<ImageFieldOptions>('image'),
  File: createFieldDecorator<FileFieldOptions>('file'),
  Gallery: createFieldDecorator<ImageFieldOptions & { maxItems?: number }>('gallery'),

  // Special
  Slug: createFieldDecorator<SlugFieldOptions>('slug'),
  Email: createFieldDecorator<TextFieldOptions>('email', {
    pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
  }),
  URL: createFieldDecorator<TextFieldOptions>('url'),
  Phone: createFieldDecorator<TextFieldOptions & { defaultCountry?: string }>('phone'),
  Address: createFieldDecorator<TextFieldOptions & { provider?: 'google' | 'mapbox' }>('address'),
  Color: createFieldDecorator<TextFieldOptions & { format?: 'hex' | 'rgb' | 'hsl' }>('color'),

  // Composition
  Object: createFieldDecorator<JSONFieldOptions>('object'),
  Array: <T>(options: ArrayFieldOptions<T>) =>
    createFieldDecorator<ArrayFieldOptions<T>>('array')(options),
  Blocks: createFieldDecorator<BaseFieldOptions & { types: string[] }>('blocks'),
  Relationship: createFieldDecorator<RelationshipFieldOptions>('relationship'),

  // Validation - alias for existing @Validators decorator
  Validators: BaseValidators,
} as const

// Export type for the Field namespace
export type FieldNamespace = typeof Field
```

### Type Safety Checklist

Before merging any code from this plan, verify:

- [ ] All field option interfaces are defined with explicit property types
- [ ] No `any` types in decorator implementations
- [ ] `createFieldDecorator` preserves generic type through to metadata
- [ ] `Field.Select` and `Field.Enum` preserve option value types
- [ ] `Field.Array` preserves item type information
- [ ] All metadata extraction uses type guards, not type assertions
- [ ] Unit tests verify type inference works correctly
- [ ] `bun run check-types` passes with 0 errors

---

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Create `packages/common/src/types/field.types.ts`
- [ ] Add `FIELD_METADATA_KEY` constant
- [ ] Implement `createFieldDecorator` factory
- [ ] Implement UI/Prop mappers
- [ ] Create `Field.Validators` alias for existing `@Validators()`

### Phase 2: Field Decorators
- [ ] Implement all 25+ field type decorators
- [ ] Create `Field` namespace export
- [ ] Write unit tests for each decorator

### Phase 3: Integration
- [ ] Update `MetadataExtractorService`
- [ ] Add Mongoose type mappings
- [ ] Add Drizzle type mappings
- [ ] Verify backwards compatibility

### Phase 4: User & Settings
- [ ] Implement `@ExtendUser()` decorator
- [ ] Implement `@Settings()` class decorator
- [ ] Implement `Setting.*` field decorators
- [ ] Update User module for extensions

### Phase 5: Admin UI
- [ ] Add ColorPicker component
- [ ] Add MarkdownEditor component
- [ ] Add AddressInput component
- [ ] Update field renderer mapping

### Phase 6: Documentation & Testing
- [ ] Write E2E tests
- [ ] Create documentation pages
- [ ] Write migration guide

---

## File Changes

### New Files
```
packages/common/src/types/field.types.ts
packages/common/src/decorators/field/field.factory.ts
packages/common/src/decorators/field/field.ui-mapper.ts
packages/common/src/decorators/field/field.prop-mapper.ts
packages/common/src/decorators/field/index.ts              # Includes Field.Validators alias
packages/common/src/decorators/field/setting-field.ts
packages/common/src/decorators/schema/extend-user.decorator.ts
packages/common/src/decorators/schema/settings.decorator.ts
packages/adapters/mongoose/src/decorators/field.mapper.ts
packages/adapters/drizzle/src/decorators/field.mapper.ts
```

### Modified Files
```
packages/common/src/constants.ts
packages/common/src/index.ts
packages/core/src/modules/discovery/services/metadata-extractor.service.ts
packages/client/admin/src/components/FormBuilder/Fields.tsx
```

---

## Backwards Compatibility

| Aspect | Behavior |
|--------|----------|
| Legacy `@Prop` | Continues to work unchanged |
| Legacy `@UI` | Continues to work unchanged |
| Legacy `@Validators` | Continues to work unchanged |
| Mixed usage | Allowed (legacy + new in same schema) |
| Discovery | Supports both metadata formats |

---

## Testing Strategy

### Unit Tests
```typescript
describe('Field.Text', () => {
  it('stores field metadata with correct type')
  it('emits legacy Prop metadata for backwards compat')
  it('emits legacy UI metadata for backwards compat')
  it('maps to correct admin UI field type')
})

describe('Field.Validators', () => {
  it('applies class-validator decorators')
  it('works with all standard validators (IsString, Length, etc.)')
  it('validation metadata is extracted by discovery service')
})
```

### E2E Tests
```typescript
describe('Field Decorators API', () => {
  it('creates document with Field decorator schema')
  it('validates constraints on publish')
  it('renders correct form fields in admin')
})
```

---

## Success Criteria

1. All 25+ Field decorators implemented and tested
2. Zero breaking changes to existing schemas
3. Admin UI renders all field types correctly
4. Documentation complete with examples
5. Migration guide available
6. **Zero `any` types** in decorator implementations
7. **Generic types preserved** through Field.Select, Field.Enum, Field.Array
8. **Type guards used** for all metadata extraction
9. **`bun run check-types` passes** with 0 errors

---

## Dependencies

- **Depends on:** Plan 000 (Type Safety Remediation)
- **Blocks:** Plan 003 (Users & Settings) - needs `@Settings` decorators
