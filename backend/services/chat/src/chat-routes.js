import { validateInternalApiKey } from './chat-help.js';

import {
	sendSystemMessage,
	getChats,
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
		chatType: {chatType},
		members:
		{
			type: 'array',
			items: member
		}
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

		socket.on('message', msg => {handleMessage(socket, msg, userId);});

		socket.on('close', () => {handleClose(socket, userId);});

		socket.on('error', (err) => {handleError(socket, err);});
	});

	fastify.get('/', getChatsOpts);

	// HTTP routes for internal service communication
	fastify.post('/send-system-message', sendSystemMessageOpts);

	// fastify.post('/create-private', )
}
