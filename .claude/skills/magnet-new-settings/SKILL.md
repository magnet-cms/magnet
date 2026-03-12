---
name: magnet-new-settings
description: Guide for adding typed settings to a Magnet CMS module using @Settings decorator
---

# Adding Settings to a Module

## Steps

1. **Create settings class** in `packages/core/src/modules/<name>/<name>.settings.ts`
   - Reference: `packages/core/src/modules/auth/auth.settings.ts`

   ```typescript
   import { SettingField, Settings } from '@magnet-cms/common'

   @Settings({
     group: '<name>',           // Unique group identifier
     label: 'Display Name',
     icon: 'lucide-icon-name',  // Lucide icon name
     order: 10,                 // Position in settings UI
     description: 'Description shown in settings UI',
     sections: [                // Optional: group fields into sections
       { name: 'general', label: 'General', icon: 'settings', order: 1 },
       { name: 'advanced', label: 'Advanced', icon: 'wrench', order: 2 },
     ],
   })
   export class MySettings {
     @SettingField.Text({
       label: 'Site Name',
       description: 'Help text shown below the field',
       default: 'My Site',
       section: 'general',  // Must match a section name
       order: 1,
     })
     siteName = 'My Site'

     @SettingField.Boolean({ label: 'Enabled', default: true, section: 'general', order: 2 })
     enabled = true
   }
   ```

2. **Available field types** via `SettingField.*`:
   - `Text` — single-line text
   - `Textarea` — multi-line text
   - `Number` — numeric value
   - `Boolean` — toggle/switch
   - `Select` — dropdown (pass `options: ['a', 'b', 'c']`)
   - `Secret` — encrypted, masked in UI (`masked: true` default)
   - `Image` — image upload
   - `JSON` — JSON editor

3. **Register in SettingsModule** — add the class to `SettingsModule.forFeature()` in your module:
   ```typescript
   @Module({
     imports: [SettingsModule.forFeature([MySettings])],
     // ...
   })
   export class MyModule {}
   ```
   Settings are auto-initialized with defaults on bootstrap.

4. **Use in services** — inject `SettingsService` and read typed settings:
   ```typescript
   const config = await this.settingsService.get(MySettings)
   console.log(config.siteName) // typed access
   ```

5. **Export** from module's `index.ts`

6. **Document** in `apps/docs/content/docs/core/<name>.mdx` — include settings table with defaults

## Key Rules

- Every field needs a `default` value and matching class property initializer
- Use `section` to organize fields when a group has 4+ fields
- `order` controls display position (lower = higher)
- `group` must be unique across all settings classes
- Admin UI renders settings automatically from decorator metadata
