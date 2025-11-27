import { validateInternalApiKey } from './chat-help.js';

import {
	sendSystemMessage,
	getChats,
	getMessages,
	addUserToChat
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

const	withCookieAuth =
{
	security: [{ cookieAuth: [] }],
	
	headers:
	{
		type: 'object',
		properties:
		{
			'accessToken':
			{
				type: 'string',
			},
			'refreshToken':
			{
				type: 'string',
			}
		}
	}
};

const	chatType =
{
	chat_type: 'string',
	enum: ['dm', 'group'],
}

const	member = 
{
	type: 'object',
	properties:
	{
		userId: { type: 'string' },
		username: { type: 'string' }
	}
}

const	chat = 
{
	type: 'object',
	properties:
	{
		id: { type: 'string' },
		name: { type: 'string' },
		chatType: {chatType},
		members:
		{
			type: 'array',
			items: member
		},
		createdAt: { type: 'string', format: 'date-time' },
		joinedAt: { type: 'string', format: 'date-time' }
	}
}

const	message =
{
	type: 'object',
	properties:
	{
		id: { type: 'string' },
		chatId: { type: 'string' },
		senderId: { type: 'string' },
		content: { type: 'string' },
		createdAt: { type: 'string', format: 'date-time' },
		messageStatus: { type: 'string', enum: ['sent', 'delivered', 'read', 'undefined'] } // undefined for messages not sent by the requestor user
	}
}

//-----------------------------PUBLIC ROUTES-----------------------------

const	getChatsOpts = 
{
	schema:
	{
		summary: 'Get all chats of the user',
		tags: ['Chat'],

		...withCookieAuth,
		...withInternalAuth,

		response:
		{
			200: {
				type: 'array',
				items: chat
			},
			400: ErrorResponse,
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: getChats
}

const	getMessagesOpts = 
{
	schema:
	{
		summary: 'Get chat messages for a specific chat',
		description: 'The message status is the overall status for the message (sent, delivered, read) only for messages sent by the requestor user.',
		tags: ['Chat'],

		...withCookieAuth,
		...withInternalAuth,

		querystring:
		{
			type: 'object',
			required: ['chatId', 'limit', 'offset'],
			properties:
			{
				chatId: { type: 'string' },
				limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }, // load up to 100 messages
				offset: { type: 'integer', minimum: 0, default: 0 } // (start from ...)
			}
		},

		response:
		{
			200: {
				type: 'array',
				items: message
			},
			400: ErrorResponse,
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler : getMessages
}

const	addUserToChatOpts = 
{
	schema:
	{
		summary: 'Send chat invite to user',
		description: 'Only friends can be invited to chats.',
		tags: ['Chat', 'Internal'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['chatId', 'toUserId'],
			properties:
			{
				chatId: { type: 'string' },
				toUserId: { type: 'string' }
			}
		},

		response:
		{
			200: {
				type: 'object',
				properties: { success: { type: 'boolean' } }
			},
			400: ErrorResponse,
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: addUserToChat
}
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
};

export function	chatRoutes(fastify)
{
	// WebSocket route for real-time chat
	fastify.get('/ws', { websocket: true }, (socket, req) =>
	{
		// if the request is invalid, reject it
		let	userId = handleNewConnection(socket, req);
		if (!userId)
			return ;

		socket.on('message', msg => {handleMessage(socket, msg, userId, fastify.chatDb);});

		socket.on('close', () => {handleClose(socket, userId);});

		socket.on('error', (err) => {handleError(socket, err);});
	});

	fastify.get('/', getChatsOpts);
	fastify.get('/chat-messages', getMessagesOpts);

	// HTTP routes for internal service communication
	fastify.post('/send-system-message', sendSystemMessageOpts);
	fastify.post('/add-user-to-chat', addUserToChatOpts);
}
