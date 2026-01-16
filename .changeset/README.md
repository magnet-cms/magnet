# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for version management and publishing.

## Adding a Changeset

When you make changes that should be released, run:

```bash
bun changeset
```

This will prompt you to:
1. Select which packages have changed
2. Choose the version bump type (major/minor/patch)
3. Write a summary of the changes

A markdown file will be created in this folder describing your changes.

## Release Process

1. **Development**: Add changesets as you make changes
2. **CI creates PR**: When changes are merged to `main`, the CI will create a "Release Packages" PR
3. **Review & Merge**: Review the PR which shows version bumps and changelog updates
4. **Publish**: Merging the PR triggers automatic publishing to npm

## Commands

| Command | Description |
|---------|-------------|
| `bun changeset` | Create a new changeset |
| `bun run version-packages` | Apply changesets and update versions (CI does this) |
| `bun run release` | Build and publish packages (CI does this) |

## Guidelines

- **patch**: Bug fixes, documentation updates
- **minor**: New features, non-breaking changes
- **major**: Breaking changes

For more information, see the [Changesets documentation](https://github.com/changesets/changesets/blob/main/docs/common-questions.md).
