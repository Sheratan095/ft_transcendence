import {
	handleNewConnection,
	handleMessage,
	handleClose,
	handleError
} from './tris-ws-handlers.js';

import {
	createUserStats as createUserStatsHandler,
	deleteUserStats as deleteUserStatsHandler,
	getUserStats as getUserStatsHandler,
	getUserMatchHistory as getUserMatchHistoryHandler
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

const	Match =
{
	type: 'object',
	properties:
	{
		id: { type: 'string' },
		playerXId: { type: 'string' },
		playerOId: { type: 'string' },
		winnerId: { type: ['string', 'null'] },
		endedAt: { type: 'string', format: 'date-time' }
	}
};

//-----------------------------INTERNAL ROUTES-----------------------------

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

//-----------------------------PUBLIC ROUTES-----------------------------

const	getUserStats =
{
	schema:
	{
		summary: 'Get user stats',
		description: 'Retrieve the stats for a given user.',
		tags: ['Public'],

		...withInternalAuth,
		...withCookieAuth,

		querystring:
		{
			type: 'object',
			required: ['id'],
			properties:
			{ id: { type: 'string' } }
		},

		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					gamesPlayed: { type: 'integer' },
					gamesWon: { type: 'integer' },
					gamesLost: { type: 'integer' },
					// gamesDrawn: { type: 'integer' }, THERE IS NO DRAW IN "INFINITE" TRIS
					elo: { type: 'integer' },
					rank: { type: 'string' }
				}
			},
			404: ErrorResponse, // In case of user's stats not found
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: getUserStatsHandler
}

const	getUserMatchHistory =
{
	schema:
	{
		summary: 'Get user match history',
		description: 'Retrieve the match history for a given user.',
		tags: ['Public'],

		...withInternalAuth,
		...withCookieAuth,
		querystring:
		{
			type: 'object',
			required: ['id'],
			properties:
			{ id: { type: 'string' } }
		},

		response:
		{
			200:
			{
				type: 'array',
				items: Match
			},
			404: ErrorResponse, // In case of user's stats not found
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: getUserMatchHistoryHandler
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

	fastify.get('/stats', getUserStats);
	fastify.get('/history', getUserMatchHistory);

	fastify.post('/create-user-stats', createUserStats);

	fastify.delete('/delete-user-stats', deleteUserStats);
}
