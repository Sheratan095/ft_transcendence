import {
	handleNewConnection,
	handleMessage,
	handleClose,
	handleError
} from './tris-ws-handlers.js';

import {
	createUserStats as createUserStatsHandler,
	deleteUserStats as deleteUserStatsHandler
} from './tris-controllers.js';

import { validateInternalApiKey } from './tris-help.js';

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

//-----------------------------INTERAL ROUTES-----------------------------

const	createUserStats = 
{
	schema:
	{
		summary: '🔒 Internal - Create user stats',
		description: 'Internal only (called by auth service when a new user is created). Creates a new stats entry for the user.',
		tags: ['Internal'],

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['userId'],
			properties:
			{
				userId: { type: 'string' }
			}
		},

		response:
		{
			201:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' }
				}
			},
			400: ErrorResponse,
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: createUserStatsHandler
}

const	deleteUserStats = 
{
	schema:
	{
		summary: '🔒 Internal - Delete user stats',
		description: 'Internal only (called by auth service when a user is deleted for GDPR compliance). Deletes the stats entry for the user.',
		tags: ['Internal'],

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['userId'],
			properties:
			{
				userId: { type: 'string' }
			}
		},

		response:
		{
			201:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' }
				}
			},
			404: ErrorResponse, // In case of user's stats not found
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: deleteUserStatsHandler
}

export function	trisRoutes(fastify)
{
	// Actual WebSocket endpoint
	fastify.get('/ws', { websocket: true }, (socket, req) =>
	{
		// if the request is invalid, reject it
		let	userId = handleNewConnection(socket, req);
		if (!userId)
			return ;

		socket.on('message', msg => {handleMessage(socket, msg, userId, fastify.trisDb);});

		socket.on('close', () => {handleClose(socket, userId);});

		socket.on('error', (err) => {handleError(socket, err, userId);});
	});

	fastify.post('/create-user-stats', createUserStats);
	fastify.delete('/delete-user-stats', deleteUserStats);
}
