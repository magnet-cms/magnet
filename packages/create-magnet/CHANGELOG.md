# create-magnet

## 1.0.0

### Major Changes

- [`f248064`](https://github.com/magnet-cms/magnet/commit/f248064db8a0d1a5669546dbdf40b6f7dc57a5b7) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - BREAKING: Renamed Supabase environment variables to match Supabase's current API key naming.
  - `SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_KEY` → `SUPABASE_SECRET_KEY`

  **Migration:** Update your `.env` file to use the new variable names. You can find these values in your Supabase project dashboard at **Settings → API → API Keys**.

## 0.2.3

### Patch Changes

- [`e09297f`](https://github.com/magnet-cms/magnet/commit/e09297ffb5d24db3afa8784a8f730b49ce0cf226) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - fix: set NODE_ENV=production in generated .env.example for standalone projects
  - Changed default NODE_ENV from 'development' to 'production' in scaffolded projects
  - Fixed README to show correct admin URL at /admin instead of port 3001
  - This fixes the admin proxy error that occurs when NODE_ENV=development
    since standalone projects don't have a Vite dev server to proxy to

## 0.2.2

### Patch Changes

- [`560ffb7`](https://github.com/magnet-cms/magnet/commit/560ffb75b24cf343fb00bf78d6231a1c601e4463) Thanks [@gjsoaresc](https://github.com/gjsoaresc)! - Fix invalid UIType 'boolean' to 'switch' in example module generator

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
