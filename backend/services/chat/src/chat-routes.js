import { validateInternalApiKey } from './chat-help.js';

import {
	sendSystemMessage,
	getConnectionStats
} from './chat-controllers.js';

import {
	handleNewConnection,
	handleMessage,
	handleClose,
	handleError
} from './event-handlers.js';

// Reusable error response schemas
const	ErrorResponse =
{
	type: 'object',
	properties:
	{
		statusCode: { type: 'integer' },
		code: { type: 'string' },
		error: { type: 'string' },
		message: { type: 'string' }
	},
	additionalProperties: true // let Fastify include unexpected fields
};

const	withInternalAuth =
{
	security: [{ internalApiKey: [] }],

	headers:
	{
		type: 'object',
		required: ['x-internal-api-key'],
		properties:
		{
			'x-internal-api-key': 
			{ 
				type: 'string',
				description: 'Internal API key for service-to-service authentication'
			}
		}
	}
};

//-----------------------------WEBSOCKET DOCUMENTATION-----------------------------

const	websocketDocumentationOpts =
{
	schema:
	{
		summary: '🔌 WebSocket connection for real-time chat',
		description: `
**WebSocket Endpoint**

Connect using WebSocket protocol to this endpoint for real-time chat functionality.

**Connection URL:**
\`\`\`
ws://localhost:${process.env.PORT || 'PORT'}/chat/ws
\`\`\`

**Required Headers:**
- \`x-internal-api-key\`: Internal API key for service authentication
- \`x-user-id\`: Authenticated user ID (extracted from JWT by gateway)
- \`upgrade\`: websocket
- \`connection\`: Upgrade

**Authentication:**
The connection will be rejected (401 Unauthorized) if:
- Invalid or missing \`x-internal-api-key\`
- Missing \`x-user-id\` header

---

### **Client → Server Events**

All events must follow this format:
\`\`\`json
{
  "event": "event.name",
  "data": { /* event-specific payload */ }
}
\`\`\`

#### **1. chat.join** - Join a chat room
\`\`\`json
{
  "event": "chat.join",
  "data": {
    "roomId": "room123"
  }
}
\`\`\`

#### **2. chat.leave** - Leave a chat room
\`\`\`json
{
  "event": "chat.leave",
  "data": {
    "roomId": "room123"
  }
}
\`\`\`

#### **3. chat.message** - Send a message to a room
\`\`\`json
{
  "event": "chat.message",
  "data": {
    "roomId": "room123",
    "message": "Hello everyone!",
    "username": "john_doe"
  }
}
\`\`\`

#### **4. chat.typing** - Send typing indicator
\`\`\`json
{
  "event": "chat.typing",
  "data": {
    "roomId": "room123",
    "isTyping": true,
    "username": "john_doe"
  }
}
\`\`\`

---

### **Server → Client Events**

All events follow this format:
\`\`\`json
{
  "event": "event.name",
  "data": { /* event-specific payload */ }
}
\`\`\`

#### **1. chat.joined** - Confirmation that you joined a room
\`\`\`json
{
  "event": "chat.joined",
  "data": {
    "roomId": "room123"
  }
}
\`\`\`

#### **2. chat.userJoined** - Another user joined the room
\`\`\`json
{
  "event": "chat.userJoined",
  "data": {
    "userId": "456",
    "roomId": "room123"
  }
}
\`\`\`

#### **3. chat.userLeft** - A user left the room
\`\`\`json
{
  "event": "chat.userLeft",
  "data": {
    "userId": "456",
    "roomId": "room123"
  }
}
\`\`\`

#### **4. chat.message** - Message received in a room
\`\`\`json
{
  "event": "chat.message",
  "data": {
    "roomId": "room123",
    "userId": "456",
    "username": "jane_smith",
    "message": "Hello everyone!",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
\`\`\`

#### **5. chat.typing** - Typing indicator from another user
\`\`\`json
{
  "event": "chat.typing",
  "data": {
    "roomId": "room123",
    "userId": "456",
    "username": "jane_smith",
    "isTyping": true
  }
}
\`\`\`

#### **6. chat.systemMessage** - System message to a room
\`\`\`json
{
  "event": "chat.systemMessage",
  "data": {
    "roomId": "room123",
    "message": "Welcome to the chat room!",
    "timestamp": "2025-11-19T10:30:00.000Z"
  }
}
\`\`\`

#### **7. error** - Error message
\`\`\`json
{
  "event": "error",
  "data": {
    "message": "Invalid message format"
  }
}
\`\`\`

---

### **Connection Lifecycle**

1. **Connect**: Client establishes WebSocket connection with required headers
2. **Authenticate**: Server validates API key and user ID
3. **Register**: User is added to connection manager
4. **Join Rooms**: Client sends \`chat.join\` events to join chat rooms
5. **Chat**: Exchange messages within rooms
6. **Leave Rooms**: Client sends \`chat.leave\` events or disconnects
7. **Disconnect**: User is removed from all rooms automatically

---

### **Error Handling**

- **Invalid API Key**: Connection refused with 401 Unauthorized
- **Missing User ID**: Connection refused with 401 Unauthorized
- **Invalid Message Format**: Server sends \`error\` event
- **Unknown Event Type**: Server sends \`error\` event
- **Missing Required Fields**: Error logged, no action taken
`,
		tags: ['Chat', 'WebSocket'],
		headers:
		{
			type: 'object',
			required: ['x-internal-api-key', 'x-user-id'],
			properties:
			{
				'x-internal-api-key':
				{
					type: 'string',
					description: 'Internal API key for service authentication'
				},
				'x-user-id':
				{
					type: 'string',
					description: 'Authenticated user ID from JWT'
				},
				'upgrade':
				{
					type: 'string',
					enum: ['websocket'],
					description: 'Must be "websocket"'
				},
				'connection':
				{
					type: 'string',
					enum: ['Upgrade'],
					description: 'Must be "Upgrade"'
				}
			}
		},
		response:
		{
			101:
			{
				description: 'Switching Protocols - WebSocket connection established',
				type: 'null'
			},
			401: ErrorResponse
		}
	}
};

//-----------------------------INTERNAL ROUTES-----------------------------

const	sendSystemMessageOpts =
{
	schema:
	{
		summary: '🔒 Internal - Send system message to room',
		tags: ['Chat', 'Internal'],
	
		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['roomId', 'message'],
			properties:
			{
				roomId: { type: 'string' },
				message: { type: 'string' }
			}
		},

		response:
		{
			200: {
				type: 'object',
				properties: {
					success: { type: 'boolean' }
				}
			},
			400: ErrorResponse,
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: sendSystemMessage
}

const	getConnectionStatsOpts =
{
	schema:
	{
		summary: '🔒 Internal - Get connection statistics',
		tags: ['Chat', 'Internal'],
	
		...withInternalAuth,

		response:
		{
			200: {
				type: 'object',
				properties: {
					connectedUsers: { type: 'integer' }
				}
			},
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: getConnectionStats
}

export function	chatRoutes(fastify)
{
	// WebSocket documentation endpoint (for Swagger only - doesn't actually work as HTTP GET)
	fastify.get('/ws/docs', websocketDocumentationOpts, async (request, reply) =>
	{
		return reply.code(501).send({
			message: 'This endpoint is for documentation only. Use WebSocket protocol to connect to /ws'
		});
	});

	// WebSocket route for real-time chat
	fastify.get('/ws', { websocket: true }, (socket, req) =>
	{
		// if the request is invalid, reject it
		let	userId = handleNewConnection(socket, req);
		if (!userId)
			return ;

		socket.on('message', msg => {handleMessage(socket, msg, userId);});

		socket.on('close', () => {handleClose(socket, userId);});

		socket.on('error', (err) => {handleError(socket, err);});
	});

	// HTTP routes for internal service communication
	fastify.post('/send-system-message', sendSystemMessageOpts);
	fastify.get('/stats', getConnectionStatsOpts);
}
