import { validateInternalApiKey } from './notification-help.js';

import {
	sendFriendRequest,
	sendFriendAccept
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

// The requester is referred to the one 
//	who SENT the friend request
const	sendFriendAcceptOpts = 
{
	schema:
	{
		summary: '🔒 Internal - Send friend accept',
		tags: ['Notifications', 'Internal'],
	
		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['accepterId', 'accepterUsername', 'relationshipId'],
			properties:
			{
				requesterId: {type: 'string'},
				accepterUsername: { type: 'string'},
			}
		},

		response:
		{
			200 : {},
			500: ErrorResponse
		}
	},

	prehandler: validateInternalApiKey,
	handler: sendFriendAccept,
}

export function	notificationRoutes(fastify)
{
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

	fastify.post('/send-friend-request', sendFriendRequestOpts);
	fastify.post('/send-friend-accept', sendFriendAcceptOpts);

}
