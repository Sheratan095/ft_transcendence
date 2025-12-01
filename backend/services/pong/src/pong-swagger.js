/**
 * WebSocket documentation for Swagger UI
 */
const	websocketDocumentationOpts =
{
	schema:
	{
		summary: '🔌 WebSocket documentation',
		description: `
Connection URL: ws://BASE_URL/pong/ws

**Authentication:**

The connection will be rejected (closed with code 1008) if JWT isn't provided in httponly cookie.

---

**CLIENT → SERVER EVENTS**

- **ping**
\`\`\`json
{
  "event": "ping",
  "data": {}
}

Reponse:
{
  "event": "pong",
  "data": {
	"timestamp": 1625247600000
  }
}
\`\`\`

**SERVER → CLIENT EVENTS**

- **error** - Error message
\`\`\`json
{
  "event": "error",
  "data": {
    "message": "Invalid message format"
  }
}
\`\`\`

---

**ERROR HANDLING**

- Invalid API Key: Connection refused with 401 Unauthorized
- Missing User ID: Connection refused with 401 Unauthorized
- Invalid Message Format: Server sends error event
- Unknown Event Type: Server sends error event
`
	}
};


/**
 * Swagger documentation setup for Pong Service
 * Provides JSON spec only - UI is handled by the gateway aggregator
 */
export async function	setupSwagger(fastify)
{
	// Setup Swagger documentation (JSON spec only)
	await fastify.register(import('@fastify/swagger'),
	{
		swagger:
		{
			info:
			{
				title: 'Pong Service API',
				description: 'Pong microservice API with WebSocket support',
				version: '1.0.0'
			},
			host: `localhost:${process.env.PORT}`,
			schemes: ['http'],
			consumes: ['application/json'],
			produces: ['application/json'],
			securityDefinitions:
			{
				internalApiKey:
				{
					type: 'apiKey',
					name: 'x-internal-api-key',
					in: 'header'
				},
				cookieAuth:
				{
					type: 'apiKey',
					name: 'JWT tokens',
					in: 'cookie'
				}
			}
		}
	});

	const	docsRouteOptions =
	{
		schema:
		{
			summary: '🔒 Internal (used by swagger aggregator)',
		}
	}

	// Manually register the JSON endpoint since we're not using swagger-ui
	fastify.get('/docs/json', docsRouteOptions, async (request, reply) =>
	{
		return fastify.swagger();
	});

	// WebSocket documentation endpoint (for Swagger only - doesn't actually work as HTTP GET)
	fastify.get('/ws/docs', websocketDocumentationOpts, async (request, reply) =>
	{
		return reply.code(501).send({
			message: 'This endpoint is for documentation only. Use WebSocket protocol to connect to /ws'
		});
	});

	console.log(`[PONG] Service Swagger JSON spec available at http://localhost:${process.env.PORT}/docs/json`);
}