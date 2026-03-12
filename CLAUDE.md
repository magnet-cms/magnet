# Magnet CMS

Bun-based Turbo monorepo — headless CMS framework built on NestJS.

## Quick Reference

| Task | Command |
|------|---------|
| Install | `bun install` |
| Dev (admin) | `bun run dev:admin` |
| Dev (docs) | `bun run dev:docs` |
| Build | `bun run build` |
| Lint | `bun run lint` |
| Type check | `bun run check-types` |
| E2E tests | `bun run test:e2e` |
| Add changeset | `bun changeset` |

**IMPORTANT:** Always run `bun run check-types` before committing.

## Rules

Detailed project rules are in `.claude/rules/`:

- `magnet-project.md` — Tech stack, packages, directory structure, all commands
- `magnet-conventions.md` — Type safety, code style, testing, documentation requirements

## Skills

On-demand guides in `.claude/skills/`:

- `magnet-new-adapter` — Adding a new database adapter
- `magnet-new-decorator` — Adding a new decorator to @magnet-cms/common
- `magnet-new-service` — Adding a new NestJS service/module to core
