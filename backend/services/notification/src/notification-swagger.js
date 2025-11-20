const	websocketDocumentationOpts =
{
	schema:
	{
		summary: '🔌 WebSocket documentation',
		description: `
Connection URL: ws://BASE_URL/notification/ws

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

---

**SERVER → CLIENT EVENTS**

- **friends.onlineList** - Sent immediately after successful connection.
\`\`\`json
{
  "event": "friends.onlineList",
  "data": {
	"onlineFriends": [
	  { "userId": "123", "username": "john_doe", "avatar": "url" },
	  { "userId": "456", "username": "jane_smith", "avatar": "url" }
	]
  }
}
\`\`\`

- **friend.online** - Sent when one of your friends comes online.
\`\`\`json
{
  "event": "friend.online",
  "data": {
	"userId": "123"
  }
}
\`\`\`

- **friend.offline** - Sent when one of your friends goes offline.
\`\`\`json
{
  "event": "friend.offline",
  "data": {
	"userId": "123"
  }
}
\`\`\`

- **friend.request** - Sent when you receive a friend request.
\`\`\`json
{
  "event": "friend.request",
  "data": {
	"from": "john_doe",
	"requesterId": "123"
  }
}
\`\`\`

- **friend.accept** - Sent when someone accepts your friend request.
\`\`\`json
{
  "event": "friend.accept",
  "data": {
	"from": "jane_smith",
	"accepterId": "456"
  }
}
\`\`\`

---

**ERROR HANDLING**

- Invalid API Key: Connection closed with code 1008
- Network Error: Standard WebSocket error events
`,
				tags: ['Notifications', 'WebSocket'],
	}
};


/**
* Swagger documentation setup for Notification Service
* Provides JSON spec only - UI is handled by the gateway aggregator
*/
export async function	setupSwagger(fastify)
{
	// Setup Swagger documentation
	await fastify.register(import('@fastify/swagger'),
	{
		swagger:
		{
			info:
			{
				title: 'Notification Service API',
				description: 'Notification microservice API',
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
		return (fastify.swagger());
	});

	// WebSocket documentation endpoint (for Swagger only - doesn't actually work as HTTP GET)
	fastify.get('/ws/docs', websocketDocumentationOpts, async (request, reply) =>
	{
		return reply.code(501).send({
			message: 'This endpoint is for documentation only. Use WebSocket protocol to connect to /ws'
		});
	});
	

	console.log(`[NOTIFICATION] Service Swagger JSON spec available at http://localhost:${process.env.PORT}/docs/json`);
}