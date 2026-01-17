# @magnet-cms/adapter-drizzle

Drizzle ORM database adapter for Magnet CMS. Supports PostgreSQL, MySQL, and SQLite through [Drizzle ORM](https://orm.drizzle.team/).

## Installation

```bash
# Install the adapter
bun add @magnet-cms/adapter-drizzle drizzle-orm

# For PostgreSQL
bun add pg
# or for Neon serverless
bun add @neondatabase/serverless

# For MySQL
bun add mysql2

# For SQLite
bun add better-sqlite3
```

## Usage

### Basic Setup

```typescript
import { MagnetModule } from '@magnet-cms/core'
import { Module } from '@nestjs/common'

@Module({
  imports: [
    MagnetModule.forRoot({
      db: {
        connectionString: process.env.DATABASE_URL,
        dialect: 'postgresql',
      },
      jwt: {
        secret: process.env.JWT_SECRET,
      },
    }),
  ],
})
export class AppModule {}
```

### With Neon (Serverless PostgreSQL)

```typescript
MagnetModule.forRoot({
  db: {
    connectionString: process.env.NEON_DATABASE_URL,
    dialect: 'postgresql',
    driver: 'neon', // Use Neon serverless driver
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
})
```

### Defining Schemas

Use the same `@Schema()` and `@Prop()` decorators from `@magnet-cms/common`:

```typescript
import { Schema, Prop } from '@magnet-cms/common'

@Schema()
export class Article {
  @Prop({ required: true, intl: true })
  title!: string

  @Prop({ intl: true })
  content?: string

  @Prop({ required: true, unique: true })
  slug!: string

  @Prop({ type: Boolean, default: false })
  featured?: boolean
}
```

The adapter automatically generates Drizzle table schemas from these decorators.

## Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `connectionString` | `string` | Database connection URL |
| `dialect` | `'postgresql' \| 'mysql' \| 'sqlite'` | SQL dialect to use |
| `driver` | `'pg' \| 'neon' \| 'mysql2' \| 'better-sqlite3'` | Database driver (auto-detected) |
| `debug` | `boolean` | Enable query logging |

## i18n and Versioning

Like the Mongoose adapter, this adapter supports document-based i18n and versioning. Each document can have multiple locale variants stored in the same table:

```sql
-- Auto-generated table structure
CREATE TABLE articles (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL,      -- Groups locale variants
  locale VARCHAR(10) DEFAULT 'en',
  status VARCHAR(20) DEFAULT 'draft',
  published_at TIMESTAMP,
  title TEXT NOT NULL,
  content TEXT,
  slug VARCHAR(255),
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_id, locale, status)
);
```

## Query Builder

The adapter provides a fluent query builder with MongoDB-style operators:

```typescript
const articles = await articleModel.query()
  .where({ status: 'active', views: { $gte: 100 } })
  .sort({ createdAt: -1 })
  .limit(10)
  .exec()
```

### Supported Operators

| Operator | SQL Equivalent |
|----------|---------------|
| `$eq` | `=` |
| `$ne` | `<>` |
| `$gt` | `>` |
| `$gte` | `>=` |
| `$lt` | `<` |
| `$lte` | `<=` |
| `$in` | `IN (...)` |
| `$nin` | `NOT IN (...)` |
| `$regex` | `ILIKE '%...%'` |
| `$like` | `LIKE` |
| `$ilike` | `ILIKE` |

## Native Access

For advanced queries, you can access the native Drizzle instance:

```typescript
const { db, table } = articleModel.native()

// Use Drizzle directly
const results = await db
  .select()
  .from(table)
  .where(sql`${table.views} > 1000`)
```

## License

MIT
