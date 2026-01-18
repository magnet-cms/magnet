# create-magnet

## 0.2.1

### Patch Changes

- [`0d764d9`](https://github.com/magnet-cms/magnet/commit/0d764d9a14f7f3ade7724525c1b08cc60fa8dc5a) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - Fix package versions to match actual published versions on npm

## 0.2.0

### Minor Changes

- [`b300d68`](https://github.com/magnet-cms/magnet/commit/b300d6823ff6d900e36e7c9fbe82b9e004790c01) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - Add create-magnet CLI tool for scaffolding new Magnet CMS projects

  Features:

  - Interactive prompts for project configuration
  - Database adapter selection (Mongoose, Drizzle+Neon, Drizzle+Supabase)
  - Plugin selection (Content Builder, SEO)
  - Storage adapter selection (Local, S3, R2, Supabase)
  - Optional example module generation
  - Package manager detection and auto-install
  - Terminal UI with ASCII banner, spinners, and colored output
