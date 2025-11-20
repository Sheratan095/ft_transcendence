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
