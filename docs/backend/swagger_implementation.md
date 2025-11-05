# Swagger API Documentation Implementation

## Overview

This document describes the Swagger/OpenAPI documentation implementation for the ft_transcendence microservices architecture. The implementation follows a **centralized aggregation pattern** where each microservice exposes its own Swagger JSON specification, and a central gateway aggregates and presents them through a unified Swagger UI.

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   API Gateway                    │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │      Swagger Aggregator                    │  │
│  │  - Discovers microservices                 │  │
│  │  - Fetches JSON specs from each service    │  │
│  │  - Merges specs with path prefixes         │  │
│  │  - Presents unified Swagger UI             │  │
│  └────────────────────────────────────────────┘  │
│                       │                          │
│                       ▼                          │
│          Unified Swagger UI at /docs             │
└──────────────────────────────────────────────────┘
          │              │              │
          ▼              ▼              ▼
    ┌────────────┐ ┌────────────┐ ┌──────────────┐
    │    Auth    │ │   Users    │ │ ............ │
    │  Service   │ │  Service   │ │   Service    │
    │            │ │            │ │              │
    │ /docs/json │ │ /docs/json │ │  /docs/json  │
    └────────────┘ └────────────┘ └──────────────┘
```

### Key Features

1. **Automatic Service Discovery**: Gateway discovers services from environment variables
2. **Dynamic Specification Aggregation**: Fetches and merges specs on-demand
3. **Auto-refresh on Page Load**: Documentation updates automatically when Swagger UI is accessed
4. **Basic Authentication Protection**: Swagger UI protected with username/password
5. **Internal API Key Security**: Service-to-service communication secured with API keys
6. **Route Hiding**: Gateway routes excluded from docs using `{ hide: true }`

---

## Gateway Implementation

### Swagger Aggregator Class

The `SwaggerAggregator` class is the core component that handles service discovery, spec fetching, merging, and UI registration.

**File**: `backend/gateway/src/swagger-aggregator.js`

```javascript
export class SwaggerAggregator {
    constructor() {
        this.services = this.discoverServices();
        this.currentSpec = null;
    }

    // Discover services from environment variables
    discoverServices() {
        const services = [];
        
        const add = (env, name, prefix) => {
            if (process.env[env]) {
                services.push({
                    name,
                    url: `${process.env[env]}/docs/json`,
                    pathPrefix: prefix
                });
            }
        };

        add("AUTH_SERVICE_URL", "auth", "/auth");
        add("USERS_SERVICE_URL", "users", "/users");
        add("NOTIFICATION_SERVICE_URL", "notification", "/notification");

        console.log(`📡 Discovered services: ${services.map(s => s.name).join(", ")}`);
        return services;
    }

    // Fetch specs from all services concurrently
    async getAggregatedSpec() {
        const results = await Promise.all(
            this.services.map(async svc => {
                try {
                    const res = await axios.get(svc.url, {
                        timeout: 5000,
                        headers: { "x-internal-api-key": process.env.INTERNAL_API_KEY }
                    });
                    return { ...svc, spec: res.data };
                } catch (err) {
                    console.warn(`⚠️ Failed to load ${svc.name} docs: ${err.message}`);
                    return null;
                }
            })
        );

        const specs = results.filter(Boolean);
        console.log(`📚 Loaded ${specs.length}/${this.services.length} specs`);
        
        return this.mergeSpecs(specs);
    }

    // Merge multiple OpenAPI specs into one
    mergeSpecs(specs) {
        const base = {
            swagger: "2.0",
            info: {
                title: "ft_transcendence API Gateway",
                description: "Unified API documentation",
                version: "1.0.0"
            },
            paths: {},
            definitions: {},
            securityDefinitions: {},
            tags: []
        };

        for (const { name, pathPrefix, spec } of specs) {
            const tag = name[0].toUpperCase() + name.slice(1);
            
            base.tags.push({ name: tag, description: `${tag} service` });

            // Merge paths with prefix
            if (spec.paths) {
                for (const [path, methods] of Object.entries(spec.paths)) {
                    const newPath = pathPrefix + path;
                    base.paths[newPath] = {};
                    
                    for (const [method, op] of Object.entries(methods))
                        base.paths[newPath][method] = { ...op, tags: [tag] };
                }
            }

            // Merge definitions with namespace
            if (spec.definitions) {
                for (const [nameKey, schema] of Object.entries(spec.definitions))
                    base.definitions[`${tag}${nameKey}`] = schema;
            }
        }

        return base;
    }
}
```

### Gateway Registration

**File**: `backend/gateway/src/gateway.js`

```javascript
// Import and initialize Swagger Aggregator
import SwaggerAggregator from './swagger-aggregator.js';
const swaggerAggregator = new SwaggerAggregator();
await swaggerAggregator.register(fastify);
```

### Swagger Registration with Authentication

```javascript
async register(fastify) {
    // Load initial spec
    this.currentSpec = await this.getAggregatedSpec();

    // Protect docs with basic auth
    await fastify.register(fastifyBasicAuth, {
        validate: async (username, password) => {
            if (username !== process.env.DOC_USERNAME || 
                password !== process.env.DOC_PASSWORD)
                throw new Error("Unauthorized");
        },
        authenticate: { realm: "Swagger Docs" }
    });

    // Register Swagger with static spec
    await fastify.register(import("@fastify/swagger"), {
        mode: "static",
        specification: { document: this.currentSpec }
    });

    // Register Swagger UI with dynamic refresh
    await fastify.register(import("@fastify/swagger-ui"), {
        routePrefix: "/docs",
        uiConfig: { docExpansion: "list", deepLinking: true },
        transformSpecificationClone: true,
        transformSpecification: (swaggerObject) => {
            // Refresh specs on every page load (fire and forget)
            console.log("🔄 Refreshing documentation on page load...");
            this.getAggregatedSpec()
                .then(spec => { this.currentSpec = spec; })
                .catch(err => {
                    console.error("❌ Failed to refresh specs:", err.message);
                });

            // Return current spec immediately
            return this.currentSpec;
        }
    });

    // Protect UI with basic auth
    fastify.addHook("onRequest", fastify.basicAuth);

    console.log("📚 Swagger UI available at → /docs");
    console.log("🔄 Docs will auto-refresh on every page load");
}
```

### Hiding Gateway Routes from Swagger

Gateway routes that proxy to microservices are excluded from the Swagger documentation using `{ schema: { hide: true } }`:

```javascript
// Routes excluded from Swagger docs
fastify.post('/auth/login', { 
    schema: { hide: true }, 
    handler: loginRoute 
})

fastify.get('/users/', { 
    schema: { hide: true }, 
    preHandler: authenticateJwtToken, 
    handler: getUsers 
})
```

---

## Microservice Implementation

Each microservice exposes its own Swagger JSON specification at `/docs/json`. The UI is not rendered at the microservice level; it's only available through the gateway.

### Common Pattern

All microservices follow the same pattern for Swagger setup:

1. Register `@fastify/swagger` plugin with service-specific metadata
2. Expose JSON spec at `/docs/json` endpoint
3. Protect the endpoint with internal API key validation

### Auth Service Example

**File**: `backend/services/auth/src/auth-swagger.js`

```javascript
export async function setupSwagger(fastify) {
    // Setup Swagger documentation (JSON spec only)
    await fastify.register(import('@fastify/swagger'), {
        swagger: {
            info: {
                title: 'Auth Service API',
                description: 'Authentication microservice API',
                version: '1.0.0'
            },
            host: `localhost:${process.env.PORT}`,
            schemes: ['http'],
            consumes: ['application/json'],
            produces: ['application/json'],
            securityDefinitions: {
                internalApiKey: {
                    type: 'apiKey',
                    name: 'x-internal-api-key',
                    in: 'header'
                },
                cookieAuth: {
                    type: 'apiKey',
                    name: 'JWT tokens',
                    in: 'cookie'
                }
            }
        }
    });

    const docsRouteOptions = {
        schema: {
            summary: '🔒 Internal (used by swagger aggregator)',
        }
    }

    // Expose JSON spec endpoint
    fastify.get('/docs/json', docsRouteOptions, async (request, reply) => {
        return fastify.swagger();
    });

    console.log(`📚 Auth Service Swagger JSON spec available at http://localhost:${process.env.PORT}/docs/json`);
}
```

### Users Service Example

**File**: `backend/services/users/src/users-swagger.js`

```javascript
export async function setupSwagger(fastify) {
    await fastify.register(import('@fastify/swagger'), {
        swagger: {
            info: {
                title: 'Users Service API',
                description: 'Users microservice API',
                version: '1.0.0'
            },
            host: `localhost:${process.env.PORT}`,
            schemes: ['http'],
            consumes: ['application/json'],
            produces: ['application/json'],
            securityDefinitions: {
                internalApiKey: {
                    type: 'apiKey',
                    name: 'x-internal-api-key',
                    in: 'header'
                },
                cookieAuth: {
                    type: 'apiKey',
                    name: 'JWT tokens',
                    in: 'cookie'
                }
            }
        }
    });

    const docsRouteOptions = {
        schema: {
            summary: '🔒 Internal (used by swagger aggregator)',
        }
    }

    fastify.get('/docs/json', docsRouteOptions, async (request, reply) => {
        return fastify.swagger();
    });

    console.log(`📚 Users Service Swagger JSON spec available at http://localhost:${process.env.PORT}/docs/json`);
}
```

---

## Route Documentation

Each route in the microservices is documented using Fastify's schema-based validation and Swagger generation.

### Reusable Schema Components

**File**: `backend/services/auth/src/auth-routes.js`

```javascript
// Reusable validation schemas with custom error messages
const PasswordPolicy = {
    type: 'string',
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+])[A-Za-z\\d!@#$%^&*()_+]{8,24}$',
    errorMessage: {
        pattern: 'Password must be 8–24 chars long and include upper, lower, number, and symbol.'
    }
};

const EmailPolicy = {
    type: 'string',
    format: 'email',
    maxLength: 254,
    errorMessage: {
        format: 'Invalid email format'
    }
}

// Reusable security headers for composition
const withInternalAuth = {
    security: [{ internalApiKey: [] }],
    headers: {
        type: 'object',
        required: ['x-internal-api-key'],
        properties: {
            'x-internal-api-key': { 
                type: 'string',
                description: 'Internal API key for service-to-service authentication'
            }
        }
    }
};

const withCookieAuth = {
    security: [{ cookieAuth: [] }],
    headers: {
        type: 'object',
        properties: {
            'accessToken': { type: 'string' },
            'refreshToken': { type: 'string' }
        }
    }
};
```

### Route Example

**File**: `backend/services/users/src/users-routes.js`

```javascript
// Route with anyOf validation (requires at least one field)
const updateUserOpts = {
    schema: {
        summary: 'Update user',
        description: 'Update user details (username and/or language). User identified from JWT.',
        tags: ['Users'],
        
        ...withInternalAuth,
        ...withCookieAuth,
        
        body: {
            type: 'object',
            properties: {
                newUsername: { ...UsernamePolicy },
                newLanguage: { ...SupportedLanguages }
            },
            // Special: Requires at least one field to be present
            anyOf: [
                { required: ['newUsername'] },
                { required: ['newLanguage'] }
            ]
        },
        
        response: {
            200: { type: 'object', properties: { message: { type: 'string' }, user: User } },
            400: ErrorResponse,
            404: ErrorResponse
        }
    },
    preHandler: validateInternalApiKey,
    handler: updateUser,
};
```

---

## Security Implementation

### 1. Internal API Key Authentication

All service-to-service communication (including Swagger spec fetching) requires an internal API key:

```javascript
// Gateway fetching specs
const res = await axios.get(svc.url, {
    timeout: 5000,
    headers: { "x-internal-api-key": process.env.INTERNAL_API_KEY }
});

// Microservice validation
export async function validateInternalApiKey(request, reply) {
    const apiKey = request.headers['x-internal-api-key'];
    
    if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
        return reply.code(401).send({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Invalid or missing internal API key'
        });
    }
}
```

### 2. Swagger UI Basic Authentication

The Swagger UI is protected with HTTP Basic Authentication:

```javascript
await fastify.register(fastifyBasicAuth, {
    validate: async (username, password) => {
        if (username !== process.env.DOC_USERNAME || 
            password !== process.env.DOC_PASSWORD)
            throw new Error("Unauthorized");
    },
    authenticate: { realm: "Swagger Docs" }
});

// Apply to all /docs routes
fastify.addHook("onRequest", fastify.basicAuth);
```

### 3. Cookie-Based JWT Authentication

API routes are protected with JWT tokens stored in HTTP-only cookies:

```javascript
const withCookieAuth = {
    security: [{ cookieAuth: [] }],
    headers: {
        type: 'object',
        properties: {
            'accessToken': { type: 'string' },
            'refreshToken': { type: 'string' }
        }
    }
};
```

---

## Environment Variables

Required environment variables for Swagger setup:

### Gateway
```bash
# Service URLs
AUTH_SERVICE_URL=
USERS_SERVICE_URL=
..._SERVICE_URL=

# Security
INTERNAL_API_KEY
DOC_PASSWORD

```

---

## Benefits of This Implementation

1. **Centralized Documentation**: Single point of access for all API documentation
2. **Auto-Discovery**: Services automatically added when environment variables are set
3. **Dynamic Updates**: Documentation refreshes automatically on page load
4. **Security**: Multiple layers (Basic Auth, Internal API Keys, JWT)
5. **Separation of Concerns**: Each service maintains its own spec
6. **Fail-Safe**: If a service is down, others still appear in docs
7. **Development-Friendly**: Easy to add new services without changing aggregator code
8. **Path Namespacing**: Routes automatically prefixed with service name

---

## Usage

### Accessing Swagger UI

1. Navigate to: `http://localhost:3000/docs`
2. Enter credentials:
   - Username: Value of `DOC_USERNAME`
   - Password: Value of `DOC_PASSWORD`
3. View unified API documentation with all services

### Testing Individual Service Specs

Each microservice exposes its raw JSON spec:

```bash
# Auth service
curl -H "x-internal-api-key: your-key" http://localhost:3001/docs/json

# Users service
curl -H "x-internal-api-key: your-key" http://localhost:3002/docs/json

# Notification service
curl -H "x-internal-api-key: your-key" http://localhost:3003/docs/json
```

---

## Adding a New Service

To add a new microservice to the documentation:

1. **In the new service**, create a swagger setup file:

```javascript
// backend/services/newservice/src/newservice-swagger.js
export async function setupSwagger(fastify) {
    await fastify.register(import('@fastify/swagger'), {
        swagger: {
            info: {
                title: 'New Service API',
                description: 'New microservice API',
                version: '1.0.0'
            },
            // ... other config
        }
    });

    fastify.get('/docs/json', async (request, reply) => {
        return fastify.swagger();
    });
}
```

2. **Register it in your service's main file**:

```javascript
import { setupSwagger } from './newservice-swagger.js';
await setupSwagger(fastify);
```

3. **Update gateway's swagger-aggregator.js**:

```javascript
add("NEWSERVICE_URL", "newservice", "/newservice");
```

4. **Add environment variable**:

```bash
NEWSERVICE_URL=http://localhost:3004
```

That's it! The gateway will automatically discover and aggregate the new service.

---

## Troubleshooting

### Service Not Appearing in Docs

- Check environment variable is set correctly
- Verify service is running and accessible
- Check logs: "📡 Discovered services: ..."
- Ensure `/docs/json` endpoint returns valid spec

### Authentication Errors

- Verify `DOC_USERNAME` and `DOC_PASSWORD` are set
- Check `INTERNAL_API_KEY` matches across all services
- Ensure cookies are enabled for JWT authentication

### Stale Documentation

- Swagger UI auto-refreshes on page load
- Hard refresh browser (Ctrl+Shift+R)
- Check service logs for refresh messages

---

## Best Practices

1. **Schema Reusability**: Define common schemas once and reuse them
2. **Detailed Descriptions**: Provide clear summaries and descriptions for all routes
3. **Error Responses**: Document all possible error responses
4. **Security Definitions**: Clearly define all authentication methods
5. **Validation Patterns**: Use JSON Schema patterns for input validation
6. **Tags**: Use consistent tags for grouping related endpoints
7. **Version Control**: Keep API version in sync across services

---

## Conclusion

This Swagger implementation provides a robust, scalable documentation system for the microservices architecture. It balances security, usability, and maintainability while allowing each service to independently document its API surface.
