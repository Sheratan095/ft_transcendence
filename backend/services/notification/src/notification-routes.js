import { validateInternalApiKey } from './notification-help.js';

import {
	sendFriendRequest
} from './notification-controllers.js';

import {
	handleNewConnection,
	handleMessage,
	handleClose,
	handleError
} from './event-hanlders.js';

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
		summary: '🔒 Internal - Send friend request',
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
			500: ErrorResponse
		}
	},

	prehandler: validateInternalApiKey,
	handler: sendFriendRequest
}

export function	notificationRoutes(fastify)
{
	fastify.post('/send-friend-request', sendFriendRequestOpts);

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
}
