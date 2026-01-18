---
"@magnet-cms/core": patch
"@magnet-cms/common": patch
"@magnet-cms/utils": patch
"@magnet-cms/adapter-mongoose": patch
"@magnet-cms/admin": patch
"@magnet-cms/ui": patch
"@magnet-cms/plugin-content-builder": patch
"@magnet-cms/plugin-seo": patch
---

Recent updates and bug fixes across all packages:

**@magnet-cms/core:**
- Add extensible authentication strategy system
- Add media storage module with upload, transforms, and admin UI
- Add runtime plugin loading system
- Add health module
- Enhance settings module
- Filter invalid environment items and add extensible auth user check
- Skip validation for drafts, validate on publish

**@magnet-cms/adapter-mongoose:**
- Add query builder for advanced database queries

**@magnet-cms/admin:**
- Enhance content manager with versioning, media uploads, and UI improvements
- Add dialog service and improve playground layout
- Add reusable PageHeader component and sidebar styling
- Add environment management and type safety improvements
- Add new form field types and multi-select component
- Reduce form field spacing and standardize date field gaps
- Fix form field alignment when some have hints and others don't
- Filter relationship selectors to show only published items

**@magnet-cms/plugin-content-builder:**
- Add rich text editor and relation config modal
- Add backend module generation and UI improvements

**@magnet-cms/common:**
- Type updates and improvements

**@magnet-cms/ui:**
- Component library updates

**@magnet-cms/utils:**
- Utility function improvements

**@magnet-cms/plugin-seo:**
- Initial setup improvements
