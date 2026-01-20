![Magnet CMS Banner](docs/assets/banner.png)

# Magnet CMS

A modern, headless CMS framework built on NestJS. Magnet provides a flexible architecture for building content management systems with a powerful admin UI and extensible plugin system.

## Features

- **NestJS Core**: Built on the robust NestJS framework for enterprise-grade applications
- **Database Agnostic**: Supports multiple databases via adapters (Mongoose, Drizzle ORM)
- **Modern Admin UI**: Beautiful React-based admin interface with comprehensive content management
- **Plugin System**: Extend functionality with plugins like Content Builder and SEO

![Magnet CMS Demo](docs/assets/magnet-demo.gif)
- **TypeScript First**: Full TypeScript support throughout the entire stack
- **Schema Discovery**: Automatic schema detection and metadata extraction
- **Authentication**: Built-in JWT authentication with guards and strategies
- **Monorepo Architecture**: Turborepo-based workspace for efficient development
- **Comprehensive Testing**: E2E testing with Playwright

## Prerequisites

- **Bun** 1.2.2 or later (recommended) or Node.js 18+
- **Database** (choose one):
  - **MongoDB** 6.0+ (for Mongoose adapter)
  - **PostgreSQL**, **MySQL**, or **SQLite** (for Drizzle adapter)
  - **Supabase** (for Supabase adapter with auth and storage)
- A terminal and code editor

## Quick Start

The fastest way to create a new Magnet CMS project is using the `create-magnet` CLI:

```bash
# Using npx
npx create-magnet my-project

# Using bun
bunx create-magnet my-project
```

The CLI will guide you through selecting:
- **Database adapter**: MongoDB (Mongoose), PostgreSQL (Drizzle + Neon), or Supabase
- **Plugins**: Content Builder, SEO
- **Storage adapter**: Local, S3, R2, Supabase, or none
- **Example module**: Optional starter CRUD module
- **Package manager**: npm, bun, pnpm, or yarn

After creation, start your project:

```bash
cd my-project
docker compose up -d  # Start the database
bun run dev           # Start the development server
```

### Development Setup (Contributing)

To contribute to Magnet CMS:

```bash
# Clone the repository
git clone https://github.com/magnet-cms/magnet.git
cd magnet

# Install dependencies
bun install

# Start development
bun run dev

# Start admin UI only
bun run dev:admin
```

## Package Overview

### CLI

| Package | Description |
|---------|-------------|
| `create-magnet` | CLI tool to scaffold new Magnet CMS projects |

### Core Packages

| Package | Description |
|---------|-------------|
| `@magnet-cms/core` | Core NestJS module with Admin, Auth, Content, and Database modules |
| `@magnet-cms/common` | Shared types, decorators, and utilities |
| `@magnet-cms/utils` | Utility functions and helpers |

### Adapters

| Package | Description |
|---------|-------------|
| `@magnet-cms/adapter-mongoose` | Mongoose database adapter with schema decorators for MongoDB |
| `@magnet-cms/adapter-drizzle` | Drizzle ORM adapter supporting PostgreSQL, MySQL, and SQLite |
| `@magnet-cms/adapter-supabase` | Supabase adapter providing auth strategy and storage adapter |

### Client Packages

| Package | Description |
|---------|-------------|
| `@magnet-cms/admin` | React-based admin UI application |
| `@magnet-cms/ui` | Shared UI component library (shadcn/ui based) |

### Plugins

| Package | Description |
|---------|-------------|
| `@magnet-cms/plugin-content-builder` | Visual content builder plugin |
| `@magnet-cms/plugin-seo` | SEO management plugin |

## Project Structure

```
magnet/
├── apps/
│   ├── e2e/               # End-to-end tests (Playwright)
│   └── examples/          # Example projects
│       ├── drizzle-neon/       # Drizzle + Neon PostgreSQL example
│       ├── drizzle-supabase/   # Drizzle + Supabase example
│       └── mongoose/           # Mongoose + MongoDB example
├── packages/
│   ├── adapters/
│   │   ├── drizzle/       # Drizzle ORM database adapter
│   │   ├── mongoose/      # Mongoose database adapter
│   │   └── supabase/      # Supabase adapter (auth & storage)
│   ├── client/
│   │   ├── admin/         # Admin UI application
│   │   └── ui/            # Shared UI component library (shadcn/ui based)
│   ├── common/            # Shared types, decorators, and utilities
│   ├── core/              # Core Magnet framework (NestJS modules)
│   ├── create-magnet/     # CLI tool for scaffolding new projects
│   ├── plugins/
│   │   ├── content-builder/   # Visual content builder plugin
│   │   └── seo/               # SEO management plugin
│   ├── tooling/           # Shared build and config tools
│   │   ├── biome/         # Biome linting configuration
│   │   ├── tsup/          # tsup build configuration
│   │   └── typescript/    # TypeScript configurations
│   └── utils/             # Utility functions
├── docs/                  # Documentation assets
├── scripts/               # Development scripts
└── package.json
```

## Available Scripts

```bash
# Development
bun run dev              # Start all packages in development mode
bun run dev:admin        # Start admin UI development server

# Building
bun run build            # Build all packages

# Code Quality
bun run lint             # Lint all packages
bun run check-types      # TypeScript type checking

# Testing
bun run test:e2e         # Run end-to-end tests
```

## Getting Started with Magnet

### Using the CLI (Recommended)

The easiest way to get started is with the `create-magnet` CLI:

```bash
npx create-magnet my-project
```

This will create a fully configured project with your chosen database, plugins, and settings.

### Manual Installation

Install Magnet in an existing NestJS project:

```bash
# For MongoDB (Mongoose adapter)
bun add @magnet-cms/core @magnet-cms/common @magnet-cms/adapter-mongoose

# For PostgreSQL/MySQL/SQLite (Drizzle adapter)
bun add @magnet-cms/core @magnet-cms/common @magnet-cms/adapter-drizzle drizzle-orm

# For Supabase
bun add @magnet-cms/core @magnet-cms/common @magnet-cms/adapter-drizzle @magnet-cms/adapter-supabase
```

### Basic Configuration

#### MongoDB (Mongoose)

Configure Magnet with Mongoose adapter in your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { MagnetModule } from '@magnet-cms/core'

@Module({
  imports: [
    MagnetModule.forRoot({
      db: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/magnet',
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      },
    }),
  ],
})
export class AppModule {}
```

#### PostgreSQL/MySQL/SQLite (Drizzle)

Configure Magnet with Drizzle adapter:

```typescript
import { Module } from '@nestjs/common'
import { MagnetModule } from '@magnet-cms/core'

@Module({
  imports: [
    MagnetModule.forRoot({
      db: {
        connectionString: process.env.DATABASE_URL,
        dialect: 'postgresql', // or 'mysql', 'sqlite'
      },
      jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      },
    }),
  ],
})
export class AppModule {}
```

#### Supabase

Configure Magnet with Supabase adapter:

```typescript
import { Module } from '@nestjs/common'
import { MagnetModule } from '@magnet-cms/core'

@Module({
  imports: [
    MagnetModule.forRoot({
      db: {
        connectionString: process.env.SUPABASE_DATABASE_URL,
        dialect: 'postgresql',
      },
      jwt: {
        secret: process.env.SUPABASE_JWT_SECRET,
      },
      // Supabase adapter provides auth and storage
    }),
  ],
})
export class AppModule {}
```

### Creating a Schema

Use decorators to define your content models:

```typescript
import { Schema, Prop } from '@magnet-cms/common'

@Schema()
export class Cat {
  @Prop({ required: true })
  name: string

  @Prop({ required: true })
  age: number

  @Prop()
  breed?: string
}
```

## Roadmap

We maintain a public roadmap to track upcoming features and improvements. The roadmap is organized into four phases:

| Phase | Focus | Key Features |
|-------|-------|--------------|
| **v1.0** | Security & Access | RBAC, User Management, API Keys, Audit Logging |
| **v1.1** | Integration & Automation | Webhooks, Scheduled Publishing, Event Hooks |
| **v1.2** | Developer Experience | GraphQL API, Full-Text Search, Preview Mode |
| **v1.3** | Team Collaboration | Approval Workflows, Comments, Bulk Operations |

**[View Full Roadmap →](https://github.com/orgs/magnet-cms/projects/3)**

Want to contribute to a roadmap feature? Check out our [Contributing Guide](CONTRIBUTING.md#working-on-roadmap-features) for details on how to get started.

## Documentation

Documentation is available through:

- This README for quick start and overview
- Example projects in `apps/examples/` for reference implementations
- JSDoc comments throughout the codebase
- Type definitions in each package

Key topics:

- **Installation**: Use `npx create-magnet` or manual installation above
- **Schemas**: Use `@Schema()` and `@Prop()` decorators from `@magnet-cms/common`
- **Adapters**: Choose Mongoose, Drizzle, or Supabase based on your database
- **Plugins**: Extend with Content Builder and SEO plugins
- **Admin UI**: Access at `http://localhost:3001` during development

## Development

### Setup Development Environment

1. Clone the repository
2. Install dependencies: `bun install`
3. Start development: `bun run dev`

### Running the Examples

```bash
# MongoDB example
cd apps/examples/mongoose
docker compose up -d
bun run dev

# Neon PostgreSQL example
cd apps/examples/drizzle-neon
# Configure .env with your Neon connection string
bun run dev

# Supabase example
cd apps/examples/drizzle-supabase
# Configure .env with your Supabase credentials
bun run dev
```

### Building Packages

```bash
# Build all packages
bun run build

# Build specific package
cd packages/core
bun run build
```

## Technology Stack

- **Runtime**: Bun / Node.js
- **Framework**: NestJS
- **Frontend**: React + Vite
- **UI Components**: shadcn/ui
- **Databases**:
  - MongoDB (via Mongoose adapter)
  - PostgreSQL / MySQL / SQLite (via Drizzle ORM adapter)
  - Supabase (via Supabase adapter)
- **Build Tool**: Turborepo + tsup
- **Testing**: Playwright
- **Code Quality**: Biome + TypeScript

## Monorepo Tools

- **Package Manager**: Bun workspaces
- **Build System**: Turborepo
- **Bundler**: tsup (for libraries), Vite (for apps)
- **Linter/Formatter**: Biome

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- How to report bugs
- How to suggest features
- Development setup and guidelines
- Coding standards and conventions
- Pull request process

## License

Magnet CMS is licensed under the [MIT License](LICENSE). See the LICENSE file for details.
