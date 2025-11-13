import { validateInternalApiKey } from './notificaiton-help.js';

import {
	sendFriendRequest
} from './notification-help.js';

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

const	sendFriendRequestOpts =
{
	schema:
	{
		summary: '🔒 Internal - Validate token',
		descritpion: 'Send a friend request notification to a user via websocket.',
		tags: ['Notifications', 'Internal'],
	
		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['requesterUsername', 'targetUserId', 'relationshipId'],
			properties:
			{
				requesterUsername: { type: 'string'},
				targetUserId: { type: 'string'},
				relationshipId: { type: 'string'}
			}
		},

		response:
		{
			200 : {},
			400: ErrorResponse,
			401: ErrorResponse,
			403: ErrorResponse,
			500: ErrorResponse
		}
	},

	prehandler: validateInternalApiKe,
	handler: sendFriendRequest
}

export function	authRoutes(fastify)
{
	fastify.post('/send-friend-request', getAccountOpts);

}
