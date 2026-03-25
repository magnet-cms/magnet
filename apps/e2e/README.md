# E2E Tests

End-to-end tests for Magnet CMS covering all examples and database adapters.

## Prerequisites

- Docker and Docker Compose installed
- Bun runtime
- Backend and frontend servers (started via `bun run dev:admin`)

## Quick Start

### Run all examples (mongoose, drizzle-neon, drizzle-supabase)

Requires **Docker** (Docker Desktop with WSL integration on WSL2). The script starts Docker, then for each example: starts the app and admin UI, runs the full e2e suite, then cleans up.

```bash
cd apps/e2e && bun run test:all
```

To test a single example:

```bash
cd apps/e2e && bun run test:all -- --example=mongoose
```

By default the script **exits on first failure** (so you don't have to cancel it). To run all examples and use retries instead, pass `--no-fail-fast`.

If Docker is not available, you'll see a clear error and this alternative:

```bash
# Run tests against servers you've already started (e.g. bun run dev:admin from an example)
cd apps/e2e && bun run test:all -- --servers-already-running
```

### Run tests only (servers already running)

```bash
# Terminal 1: start Docker + app (e.g. from repo root or example)
bun run docker:start mongoose
# then from apps/examples/mongoose: bun run dev:admin

# Terminal 2: run tests
cd apps/e2e && bun run test
```

## Available Examples

- `mongoose` - MongoDB with example content schemas
- `drizzle-neon` - PostgreSQL (Drizzle ORM) with Neon driver
- `drizzle-supabase` - Full Supabase stack (PostgreSQL + Auth + Storage)

## Docker Management

### Start Docker Containers

```bash
# Start all examples
bun run docker:stop-all

# Start specific template
bun run docker:start mongoose
```

### Stop Docker Containers

```bash
# Stop all examples
bun run docker:stop-all

# Stop specific template
bun run docker:stop mongoose
```

### Using Shell Scripts

```bash
# Setup (start all containers)
./scripts/setup-test-env.sh

# Teardown (stop all containers)
./scripts/teardown-test-env.sh

# Setup specific template
./scripts/setup-test-env.sh mongoose
```

## Test Scripts

- `bun run test` - Run all tests
- `bun run test:api` - Run API tests only
- `bun run test:ui` - Run UI tests only
- `bun run test:headed` - Run tests in headed mode
- `bun run test:debug` - Run tests in debug mode
- `bun run test:report` - Show test report

## Example-Specific Testing

Each example has its own Docker setup:

### mongoose

- **Database**: MongoDB
- **Port**: 27017
- **Connection**: `mongodb://localhost:27017/cats-example`

### drizzle-neon

- **Database**: PostgreSQL
- **Port**: 5433
- **Connection**: `postgresql://postgres:postgres@localhost:5433/neon-example`

### drizzle-supabase

- **Database**: Full Supabase stack
- **Ports**: 5432 (PostgreSQL), 8000 (Kong), 3010 (Studio)
- **Connection**: `postgresql://postgres:postgres@localhost:5432/postgres`

## Environment Variables

Tests automatically set the correct environment variables for each example. You can override them:

```bash
MONGODB_URI=mongodb://localhost:27017/cats-example \
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/neon-example \
bun run test
```

### Playground / Content Builder tests

API tests for the Content Builder plugin (Playground) create schema modules on disk. By default they are written into the example app’s `src/modules/`, which can leave `test*` directories (e.g. `test33a9dbf1`) in the repo.

To avoid that, start the server with a dedicated modules path **before** running e2e:

```bash
# From the example app (e.g. apps/examples/mongoose)
MAGNET_PLAYGROUND_MODULES_PATH=/tmp/magnet-e2e-modules bun run dev:admin
```

Then run tests from another terminal. Generated modules are written to `/tmp/magnet-e2e-modules` instead of `src/modules/`. You can use any path outside the repo (e.g. `./.e2e-modules` if you prefer a local dir). Any existing `test*` directories in the example are ignored via `.gitignore`.

## CI/CD

For CI environments, use the setup scripts:

```yaml
# Example GitHub Actions
- name: Setup test environment
  run: ./apps/e2e/scripts/setup-test-env.sh

- name: Run tests
  run: cd apps/e2e && bun run test

- name: Teardown
  run: ./apps/e2e/scripts/teardown-test-env.sh
```

## Troubleshooting

### Docker containers not starting

```bash
# Check Docker is running
docker ps

# Check container logs
docker compose -f apps/examples/mongoose/docker/docker-compose.yml logs
```

### Port conflicts

If you have existing databases running, the examples use different ports:

- mongoose: 27017
- drizzle-neon: 5433
- drizzle-supabase: 5432

### Tests failing

1. Ensure Docker containers are running and healthy
2. Ensure backend server is running (`bun run dev:admin`)
3. Check server logs for errors
4. Verify environment variables are set correctly
