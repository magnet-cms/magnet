---
"@magnet-cms/core": minor
"@magnet-cms/admin": minor
---

Add email template management system with Lexical editor and locale support.

- New `EmailTemplateModule` with CRUD endpoints and version history
- `GET /email-templates/by-slug/:slug` for locale-aware template retrieval
- Admin UI with Lexical-based rich text editor and live iframe preview
- Locale variant switching via ContentHeader locale switcher
- Variable badge nodes in the editor for template syntax highlighting
- DataTable-based listing page
