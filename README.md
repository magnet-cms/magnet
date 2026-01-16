# Magnet CMS

A modern, headless CMS framework built on NestJS. Magnet provides a flexible architecture for building content management systems with a powerful admin UI and extensible plugin system.

## Features

- **NestJS Core**: Built on the robust NestJS framework for enterprise-grade applications
- **Database Agnostic**: Ships with Mongoose adapter, easily extensible for other databases
- **Modern Admin UI**: Beautiful React-based admin interface with comprehensive content management
- **Plugin System**: Extend functionality with plugins like Content Builder and SEO
- **TypeScript First**: Full TypeScript support throughout the entire stack
- **Schema Discovery**: Automatic schema detection and metadata extraction
- **Authentication**: Built-in JWT authentication with guards and strategies
- **Monorepo Architecture**: Turborepo-based workspace for efficient development
- **Comprehensive Testing**: E2E testing with Playwright

## Prerequisites

- **Bun** 1.2.2 or later (recommended) or Node.js 18+
- **MongoDB** 6.0+ (for Mongoose adapter)
- A terminal and code editor

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd magnet

# Install dependencies
bun install

# Start development
bun run dev

# Start admin UI only
bun run dev:admin
```

## Package Overview

### Core Packages

| Package | Description |
|---------|-------------|
| `@magnet/core` | Core NestJS module with Admin, Auth, Content, and Database modules |
| `@magnet/common` | Shared types, decorators, and utilities |
| `@magnet/utils` | Utility functions and helpers |

### Adapters

| Package | Description |
|---------|-------------|
| `@magnet/adapter-mongoose` | Mongoose database adapter with schema decorators |

### Client Packages

| Package | Description |
|---------|-------------|
| `@magnet/admin` | React-based admin UI application |
| `@magnet/ui` | Shared UI component library (shadcn/ui based) |

### Plugins

| Package | Description |
|---------|-------------|
| `@magnet/plugin-content-builder` | Visual content builder plugin |
| `@magnet/plugin-seo` | SEO management plugin |

## Project Structure

```
magnet/
├── apps/
│   ├── cats-example/      # Example NestJS application with Magnet
│   ├── docs/              # Documentation site (Next.js + Fumadocs)
│   └── e2e/               # End-to-end tests (Playwright)
├── packages/
│   ├── adapters/
│   │   └── mongoose/      # Mongoose database adapter
│   ├── client/
│   │   ├── admin/         # Admin UI application
│   │   └── ui/            # Shared component library
│   ├── common/            # Shared types and decorators
│   ├── core/              # Core Magnet framework
│   ├── plugins/
│   │   ├── content-builder/
│   │   └── seo/
│   ├── tooling/           # Shared build and config tools
│   └── utils/             # Utility functions
└── package.json
```

## Available Scripts

```bash
# Development
bun run dev              # Start all packages in development mode
bun run dev:admin        # Start admin UI development server
bun run dev:docs         # Start documentation site

# Building
bun run build            # Build all packages

# Code Quality
bun run lint             # Lint all packages
bun run check-types      # TypeScript type checking

# Testing
bun run test:e2e         # Run end-to-end tests
```

## Getting Started with Magnet

### Installation

Install Magnet in your NestJS project:

```bash
bun add @magnet/core @magnet/common @magnet/adapter-mongoose
```

### Basic Configuration

Configure Magnet in your `app.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { MagnetModule } from '@magnet/core'
import { MongooseAdapter } from '@magnet/adapter-mongoose'

@Module({
  imports: [
    MagnetModule.forRoot({
      adapter: new MongooseAdapter({
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/magnet',
      }),
    }),
  ],
})
export class AppModule {}
```

### Creating a Schema

Use decorators to define your content models:

```typescript
import { Schema, Prop } from '@magnet/common'

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

## Documentation

Comprehensive documentation is available at the `/apps/docs` directory or by running:

```bash
bun run dev:docs
```

Visit the documentation to learn more about:

- Installation and setup
- Core concepts
- Creating schemas
- Using adapters
- Building plugins
- Admin UI customization
- API reference

## Development

### Setup Development Environment

1. Clone the repository
2. Install dependencies: `bun install`
3. Start development: `bun run dev`

### Running the Example App

```bash
cd apps/cats-example
bun install
bun run start:dev
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
- **Database**: MongoDB (Mongoose)
- **Build Tool**: Turborepo + tsup
- **Testing**: Playwright
- **Documentation**: Next.js + Fumadocs
- **Code Quality**: Biome + TypeScript

## Monorepo Tools

- **Package Manager**: Bun workspaces
- **Build System**: Turborepo
- **Bundler**: tsup (for libraries), Vite (for apps)
- **Linter/Formatter**: Biome

## License

[License information to be added]

## Contributing

[Contributing guidelines to be added]
