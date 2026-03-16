# PostgreSQL Docker Setup for drizzle-neon Template

This directory contains Docker Compose configuration for running PostgreSQL locally for testing and development.

## Usage

### Start PostgreSQL

```bash
docker compose -f docker/docker-compose.yml up -d
```

### Stop PostgreSQL

```bash
docker compose -f docker/docker-compose.yml down
```

### View Logs

```bash
docker compose -f docker/docker-compose.yml logs -f
```

## Connection String

When PostgreSQL is running, use this connection string:

```
postgresql://postgres:postgres@localhost:5433/neon-example
```

Note: This template uses port 5433 to avoid conflicts with other PostgreSQL instances.

## Environment Variables

Set in your `.env` file or environment:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/neon-example
JWT_SECRET=your-secret-key
```

## For Neon Cloud

If you want to use Neon cloud instead of local PostgreSQL, get your connection string from [Neon Console](https://console.neon.tech) and set:

```env
DATABASE_URL=your-neon-connection-string
```
