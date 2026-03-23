---
"@magnet-cms/common": minor
"@magnet-cms/admin": minor
---

Add `autoSave` and `readOnly` options to the `@Schema` decorator:

- `autoSave: false` — disables auto-draft creation on "New Entry"; the document is only saved when the user explicitly clicks "Save Draft"
- `readOnly: true` — hides create/edit/delete actions in the admin panel; entries can still be managed via the API
