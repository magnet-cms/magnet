import type {
  OASDocument,
  OASOperation,
  OASParameter,
  OASPathItem,
  OASSchema,
  OpenAPIConfig,
} from './openapi.types'

// ─── Reusable schema references ───────────────────────────────────────────────

const schemaParam: OASParameter = {
  name: 'schema',
  in: 'path',
  required: true,
  description: 'Content schema name (e.g. "articles", "products")',
  schema: { type: 'string' },
}

const documentIdParam: OASParameter = {
  name: 'documentId',
  in: 'path',
  required: true,
  description: 'Document ID',
  schema: { type: 'string' },
}

const localeQuery: OASParameter = {
  name: 'locale',
  in: 'query',
  required: false,
  description: 'Locale code (e.g. "en", "es")',
  schema: { type: 'string' },
}

const statusQuery: OASParameter = {
  name: 'status',
  in: 'query',
  required: false,
  description: 'Document status filter',
  schema: { type: 'string', enum: ['draft', 'published'] },
}

const bearerSecurity = [{ bearerAuth: [] }]
const apiKeySecurity = [{ apiKey: [] }]
const bothSecurity = [...bearerSecurity, ...apiKeySecurity]

const ok200 = { description: 'Success' }
const created201 = { description: 'Created' }
const _noContent204 = { description: 'No Content' }
const unauthorized401 = { description: 'Unauthorized' }
const notFound404 = { description: 'Not Found' }
const badRequest400 = { description: 'Bad Request' }

// ─── Reusable schemas ─────────────────────────────────────────────────────────

const documentSchema: OASSchema = {
  type: 'object',
  description: 'A content document',
  properties: {
    _id: { type: 'string', description: 'Internal database ID' },
    documentId: { type: 'string', description: 'Unique document identifier' },
    locale: { type: 'string', description: 'Document locale' },
    status: {
      type: 'string',
      enum: ['draft', 'published'],
      description: 'Publication status',
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
}

const authResultSchema: OASSchema = {
  type: 'object',
  properties: {
    access_token: { type: 'string', description: 'JWT access token' },
    refresh_token: { type: 'string', description: 'JWT refresh token' },
    user: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string', format: 'email' },
        role: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
}

const userSchema: OASSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    email: { type: 'string', format: 'email' },
    role: { type: 'string' },
    name: { type: 'string' },
  },
}

// ─── Path definitions ─────────────────────────────────────────────────────────

function authPaths(): Record<string, OASPathItem> {
  return {
    '/auth/register': {
      post: {
        summary: 'Register a new user',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'name'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                  name: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Registration successful',
            content: {
              'application/json': { schema: authResultSchema },
            },
          },
          '400': badRequest400,
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login with email and password',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': { schema: authResultSchema },
            },
          },
          '401': unauthorized401,
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh access token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refresh_token'],
                properties: { refresh_token: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Token refreshed',
            content: { 'application/json': { schema: authResultSchema } },
          },
          '401': unauthorized401,
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Logout (revoke refresh token)',
        tags: ['Auth'],
        security: bearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { refresh_token: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': ok200, '401': unauthorized401 },
      },
    },
    '/auth/logout-all': {
      post: {
        summary: 'Logout from all devices',
        tags: ['Auth'],
        security: bearerSecurity,
        responses: { '200': ok200, '401': unauthorized401 },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user profile',
        tags: ['Auth'],
        security: bearerSecurity,
        responses: {
          '200': {
            description: 'Current user',
            content: { 'application/json': { schema: userSchema } },
          },
          '401': unauthorized401,
        },
      },
      put: {
        summary: 'Update current user profile',
        tags: ['Auth'],
        security: bearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated user',
            content: { 'application/json': { schema: userSchema } },
          },
          '401': unauthorized401,
        },
      },
    },
    '/auth/status': {
      get: {
        summary: 'Get authentication status',
        tags: ['Auth'],
        responses: {
          '200': {
            description: 'Auth status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    authenticated: { type: 'boolean' },
                    requiresSetup: { type: 'boolean' },
                    onboardingCompleted: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/forgot-password': {
      post: {
        summary: 'Request password reset email',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: { '200': ok200, '400': badRequest400 },
      },
    },
    '/auth/reset-password': {
      post: {
        summary: 'Reset password with token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: {
                  token: { type: 'string' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: { '200': ok200, '400': badRequest400 },
      },
    },
    '/auth/change-password': {
      put: {
        summary: 'Change password for authenticated user',
        tags: ['Auth'],
        security: bearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: {
                    type: 'string',
                    format: 'password',
                  },
                  newPassword: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: { '200': ok200, '401': unauthorized401 },
      },
    },
    '/auth/sessions': {
      get: {
        summary: 'List active sessions',
        tags: ['Auth'],
        security: bearerSecurity,
        responses: { '200': ok200, '401': unauthorized401 },
      },
    },
    '/auth/sessions/{sessionId}': {
      delete: {
        summary: 'Revoke a specific session',
        tags: ['Auth'],
        security: bearerSecurity,
        parameters: [
          {
            name: 'sessionId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': ok200,
          '401': unauthorized401,
          '404': notFound404,
        },
      },
    },
  }
}

function contentPaths(): Record<string, OASPathItem> {
  const listOp: OASOperation = {
    summary: 'List documents for a schema',
    tags: ['Content'],
    security: bothSecurity,
    parameters: [schemaParam, localeQuery, statusQuery],
    responses: {
      '200': {
        description: 'List of documents',
        content: {
          'application/json': {
            schema: { type: 'array', items: documentSchema },
          },
        },
      },
      '401': unauthorized401,
    },
  }

  const createOp: OASOperation = {
    summary: 'Create a new document',
    tags: ['Content'],
    security: bothSecurity,
    parameters: [schemaParam],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              data: { type: 'object', description: 'Document field data' },
              locale: { type: 'string' },
              createdBy: { type: 'string' },
            },
          },
        },
      },
    },
    responses: {
      '201': {
        description: 'Created document',
        content: { 'application/json': { schema: documentSchema } },
      },
      '400': badRequest400,
      '401': unauthorized401,
    },
  }

  return {
    '/content/{schema}': {
      get: listOp,
      post: createOp,
    },
    '/content/{schema}/new': {
      post: {
        summary: 'Create an empty document (returns documentId immediately)',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [schemaParam],
        responses: {
          '201': {
            description: 'Created empty document',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { documentId: { type: 'string' } },
                },
              },
            },
          },
          '401': unauthorized401,
        },
      },
    },
    '/content/{schema}/{documentId}': {
      get: {
        summary: 'Get a document by ID',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [schemaParam, documentIdParam, localeQuery, statusQuery],
        responses: {
          '200': {
            description: 'Document',
            content: { 'application/json': { schema: documentSchema } },
          },
          '401': unauthorized401,
          '404': notFound404,
        },
      },
      put: {
        summary: 'Update a document',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [schemaParam, documentIdParam, localeQuery, statusQuery],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'object' },
                  updatedBy: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Updated document',
            content: { 'application/json': { schema: documentSchema } },
          },
          '401': unauthorized401,
          '404': notFound404,
        },
      },
      delete: {
        summary: 'Delete a document',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [schemaParam, documentIdParam],
        responses: {
          '200': ok200,
          '401': unauthorized401,
          '404': notFound404,
        },
      },
    },
    '/content/{schema}/{documentId}/publish': {
      post: {
        summary: 'Publish a document locale',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [schemaParam, documentIdParam, localeQuery],
        responses: {
          '200': {
            description: 'Published document',
            content: { 'application/json': { schema: documentSchema } },
          },
          '401': unauthorized401,
          '404': notFound404,
        },
      },
    },
    '/content/{schema}/{documentId}/unpublish': {
      post: {
        summary: 'Unpublish a document locale',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [schemaParam, documentIdParam, localeQuery],
        responses: { '200': ok200, '401': unauthorized401 },
      },
    },
    '/content/{schema}/{documentId}/versions': {
      get: {
        summary: 'Get version history for a document',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [schemaParam, documentIdParam, localeQuery],
        responses: {
          '200': {
            description: 'Version list',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
          '401': unauthorized401,
        },
      },
    },
    '/content/{schema}/{documentId}/restore': {
      post: {
        summary: 'Restore a document to a previous version',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [
          schemaParam,
          documentIdParam,
          localeQuery,
          {
            name: 'version',
            in: 'query',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Restored document',
            content: { 'application/json': { schema: documentSchema } },
          },
          '401': unauthorized401,
          '404': notFound404,
        },
      },
    },
    '/content/{schema}/{documentId}/locale': {
      post: {
        summary: 'Add a new locale to a document',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [schemaParam, documentIdParam],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['locale', 'data'],
                properties: {
                  locale: { type: 'string' },
                  data: { type: 'object' },
                },
              },
            },
          },
        },
        responses: {
          '201': created201,
          '400': badRequest400,
          '401': unauthorized401,
        },
      },
    },
    '/content/{schema}/{documentId}/locale/{locale}': {
      delete: {
        summary: 'Delete a specific locale from a document',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [
          schemaParam,
          documentIdParam,
          {
            name: 'locale',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': ok200, '401': unauthorized401, '404': notFound404 },
      },
    },
    '/content/{schema}/{documentId}/locales': {
      get: {
        summary: 'Get locale statuses for a document',
        tags: ['Content'],
        security: bothSecurity,
        parameters: [schemaParam, documentIdParam],
        responses: {
          '200': {
            description: 'Locale status list',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } },
              },
            },
          },
          '401': unauthorized401,
        },
      },
    },
  }
}

function storagePaths(): Record<string, OASPathItem> {
  return {
    '/storage/media': {
      get: {
        summary: 'List media files',
        tags: ['Storage'],
        security: bothSecurity,
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'folder', in: 'query', schema: { type: 'string' } },
          { name: 'mimeType', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': ok200, '401': unauthorized401 },
      },
      post: {
        summary: 'Upload a media file',
        tags: ['Storage'],
        security: bothSecurity,
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object' } } },
        },
        responses: {
          '201': created201,
          '400': badRequest400,
          '401': unauthorized401,
        },
      },
    },
    '/storage/media/{id}': {
      get: {
        summary: 'Get media file by ID',
        tags: ['Storage'],
        security: bothSecurity,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': ok200, '401': unauthorized401, '404': notFound404 },
      },
      put: {
        summary: 'Update media file metadata',
        tags: ['Storage'],
        security: bothSecurity,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': ok200, '401': unauthorized401, '404': notFound404 },
      },
      delete: {
        summary: 'Delete a media file',
        tags: ['Storage'],
        security: bothSecurity,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': ok200,
          '401': unauthorized401,
          '404': notFound404,
        },
      },
    },
  }
}

function apiKeysPaths(): Record<string, OASPathItem> {
  return {
    '/api-keys': {
      get: {
        summary: 'List API keys',
        tags: ['API Keys'],
        security: bearerSecurity,
        responses: { '200': ok200, '401': unauthorized401 },
      },
      post: {
        summary: 'Create an API key',
        tags: ['API Keys'],
        security: bearerSecurity,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string' },
                  permissions: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  expiresAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        responses: {
          '201': created201,
          '400': badRequest400,
          '401': unauthorized401,
        },
      },
    },
    '/api-keys/{id}': {
      get: {
        summary: 'Get an API key',
        tags: ['API Keys'],
        security: bearerSecurity,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': ok200, '401': unauthorized401, '404': notFound404 },
      },
      put: {
        summary: 'Update an API key',
        tags: ['API Keys'],
        security: bearerSecurity,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': ok200, '401': unauthorized401, '404': notFound404 },
      },
      delete: {
        summary: 'Delete an API key',
        tags: ['API Keys'],
        security: bearerSecurity,
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': ok200, '401': unauthorized401, '404': notFound404 },
      },
    },
  }
}

function settingsPaths(): Record<string, OASPathItem> {
  return {
    '/settings/{group}': {
      get: {
        summary: 'Get settings for a group',
        tags: ['Settings'],
        security: bearerSecurity,
        parameters: [
          {
            name: 'group',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': ok200, '401': unauthorized401, '404': notFound404 },
      },
      put: {
        summary: 'Update settings for a group',
        tags: ['Settings'],
        security: bearerSecurity,
        parameters: [
          {
            name: 'group',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': ok200, '401': unauthorized401 },
      },
    },
  }
}

function healthPaths(): Record<string, OASPathItem> {
  return {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok', 'error'] },
                  },
                },
              },
            },
          },
        },
      },
    },
  }
}

// ─── Main builder ─────────────────────────────────────────────────────────────

/**
 * Build the full OpenAPI 3.0 document for a Magnet CMS instance.
 * Routes are hardcoded for all Magnet built-in controllers.
 * Dynamic content schema components are added via enrichDocumentWithSchemas().
 */
export function buildOpenAPIDocument(config: OpenAPIConfig): OASDocument {
  const paths: Record<string, OASPathItem> = {
    ...authPaths(),
    ...contentPaths(),
    ...storagePaths(),
    ...apiKeysPaths(),
    ...settingsPaths(),
    ...healthPaths(),
  }

  return {
    openapi: '3.0.0',
    info: {
      title: config.title ?? 'Magnet CMS API',
      version: config.version ?? '1.0.0',
      description: 'API for Magnet CMS — headless content management system',
    },
    security: [{ bearerAuth: [] }, { apiKey: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication and user management' },
      { name: 'Content', description: 'Dynamic content CRUD operations' },
      { name: 'Storage', description: 'Media and file storage' },
      { name: 'API Keys', description: 'Programmatic API key management' },
      { name: 'Settings', description: 'Application settings' },
      { name: 'Health', description: 'Health check' },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token from /auth/login',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'API key from the API Keys management page',
        },
      },
      schemas: {
        Document: documentSchema,
        AuthResult: authResultSchema,
        User: userSchema,
      },
    },
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Generate a Swagger UI HTML page that loads the spec from the given specUrl.
 */
export function buildSwaggerUiHtml(title: string, specUrl: string): string {
  const safeTitle = escapeHtml(title)
  const safeSpecUrl = JSON.stringify(specUrl)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: ${safeSpecUrl},
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      deepLinking: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
    })
  </script>
</body>
</html>`
}
