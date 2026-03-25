import type { ProjectConfig } from '../types.js'

export function generateDockerCompose(config: ProjectConfig): string {
  const { database, projectName, supabaseLocalMode } = config

  if (database === 'mongoose') {
    return generateMongoDockerCompose(projectName)
  }

  // Supabase CLI mode uses `supabase start` instead of Docker Compose
  if (database === 'drizzle-supabase' && supabaseLocalMode === 'cli') {
    return ''
  }

  return generatePostgresDockerCompose(projectName)
}

function generateMongoDockerCompose(projectName: string): string {
  const containerName = projectName.replace(/[^a-z0-9-]/gi, '-')

  return `services:
  mongodb:
    image: mongo:7.0
    container_name: ${containerName}-mongodb
    restart: unless-stopped
    ports:
      - "\${MONGO_PORT:-27017}:27017"
    environment:
      MONGO_INITDB_DATABASE: ${projectName}
      MONGO_INITDB_ROOT_USERNAME: magnet
      MONGO_INITDB_ROOT_PASSWORD: magnet
    volumes:
      - mongodb-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongo-express:
    image: mongo-express:1
    container_name: ${containerName}-mongo-express
    restart: unless-stopped
    ports:
      - "\${MONGO_EXPRESS_PORT:-8081}:8081"
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: magnet
      ME_CONFIG_MONGODB_ADMINPASSWORD: magnet
      ME_CONFIG_MONGODB_URL: mongodb://magnet:magnet@mongodb:27017/
      ME_CONFIG_BASICAUTH: "false"
    depends_on:
      mongodb:
        condition: service_healthy

volumes:
  mongodb-data:
`
}

function generatePostgresDockerCompose(projectName: string): string {
  const containerName = projectName.replace(/[^a-z0-9-]/gi, '-')

  return `services:
  postgres:
    image: postgres:16-alpine
    container_name: ${containerName}-postgres
    restart: unless-stopped
    ports:
      - "\${POSTGRES_PORT:-5432}:5432"
    environment:
      POSTGRES_DB: ${projectName}
      POSTGRES_USER: magnet
      POSTGRES_PASSWORD: magnet
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U magnet -d ${projectName}"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: ${containerName}-pgadmin
    restart: unless-stopped
    ports:
      - "\${PGADMIN_PORT:-5050}:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@magnet.local
      PGADMIN_DEFAULT_PASSWORD: magnet
      PGADMIN_CONFIG_SERVER_MODE: "False"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres-data:
`
}

export function generateSupabaseConfig(projectName: string): string {
  return `[project]
id = "${projectName}"
name = "${projectName}"

[api]
enabled = true
port = 54321
schemas = ["public"]

[db]
port = 54322
major_version = 15

[studio]
enabled = true
port = 54323

[auth]
enabled = true
site_url = "http://localhost:3000"

[storage]
enabled = true
`
}
