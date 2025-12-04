/**
 * WebSocket documentation for Swagger UI
 */
const	websocketDocumentationOpts =
{
	schema:
	{
		summary: '🔌 WebSocket documentation',
		description: `
Connection URL: ws://BASE_URL/chat/ws

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

- **chat.read** - A user visualized that chat [TO DO]
\`\`\`json
{
  "event": "chat.read",
  "data": {
    "chatId": "chat123"
  }
}

\`\`\`

- **chat.message** - Send a message to a chat
\`\`\`json
{
  "event": "chat.message",
  "data": {
    "chatId": "chat123",
    "content": "Hello everyone!"
  }
}

Response (acknowledgment to sender):
{
  "event": "chat.messageSent",
  "data": {
    "chatId": "chat123",
    "messageId": "msg789",
    "content": "Hello everyone!",
    "status": "delivered", // or "sent" if some users are offline,
    "chatType": "group"
  }
}
\`\`\`

- **chat.privateMessage** - Send a private message to a user
\`\`\`json
{
  "event": "chat.privateMessage",
  "data": {
    "toUserId": "user456",
    "content": "Hello everyone!"
  }
}

Response (acknowledgment to sender):
{
  "event": "chat.messageSent",
  "data": {
    "chatId": "chat789",
    "messageId": "msg123",
    "content": "Hello everyone!",
    "status": "delivered", // or "sent" if recipient is offline,
    "chatType": "dm"
  }
}
\`\`\`

- **chat.typing** - Send typing indicator [NOT IMPLEMENTED YET]
\`\`\`json
{
  "event": "chat.typing",
  "data": {
    "chatId": "chat123",
    "isTyping": true
  }
}
\`\`\`

---

**SERVER → CLIENT EVENTS**


- **chat.userLeft** - A user left the chat [NOT IMPLEMENTED YET]
\`\`\`json
{
  "event": "chat.userLeft",
  "data": {
    "userId": "456",
    "chatId": "chat123"
  }
}
\`\`\`

- **chat.message** - Message received in a chat
\`\`\`json
{
  "event": "chat.message",
  "data": {
    "chatId": "chat123",
    "from": "jane_smith",
    "senderId": "456",
    "messageId": "msg789",
    "content": "Hello everyone!",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
\`\`\`

- **chat.privateMessage** - Message received from a user
\`\`\`json
{
  "event": "chat.privateMessage",
  "data": {
    "from": "jane_smith",
    "senderId": "456",
    "messageId": "msg123",
    "chatId": "chat789",
    "content": "Hello everyone!",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
\`\`\`

- **chat.messageSent** - Acknowledgment that your message was sent
\`\`\`json
{
  "event": "chat.messageSent",
  "data": {
    "chatId": "chat789",
    "messageId": "msg123",
    "status": "delivered" // "delivered" if sent to all recipients, "sent" if some are offline
  }
}
\`\`\`

- **chat.messageStatusUpdate** - Update on message status (delivered/read)
\`\`\`json
{
  event: "chat.messageStatusUpdate",
  data: {
    chatId: "456",
    messageId: "456",
    overallStatus: "delivered"
  }
}
\`\`\`

- **chat.typing** - Typing indicator from another user [NOT IMPLEMENTED YET]
\`\`\`json
{
  "event": "chat.typing",
  "data": {
    "chatId": "chat123",
    "userId": "456",
    "username": "jane_smith",
    "isTyping": true
  }
}
\`\`\`

- **chat.systemMessage** - System message to a chat
\`\`\`json
{
  "event": "chat.systemMessage",
  "data": {
    "chatId": "chat123",
    "message": "Welcome to the chat!",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
\`\`\`

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
 * Swagger documentation setup for Chat Service
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
				title: 'Chat Service API',
				description: 'Chat microservice API with WebSocket support',
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

	console.log(`[CHAT] Service Swagger JSON spec available at http://localhost:${process.env.PORT}/docs/json`);
}