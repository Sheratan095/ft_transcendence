import { validateInternalApiKey } from './notification-help.js';

import {
	sendFriendRequest,
	// sendFriendAccept,
	send2FaCode,
	getActiveUsersCount,
	sendChatUserAdded,
	sendGameInvite,
	sendNowFriends
} from './notification-controllers.js';

import {
	handleNewConnection,
	handleMessage,
	handleClose,
	handleError
} from './notification-ws-handlers.js';

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

const	availableGameTypes = ['pong', 'tris'];

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
			required: ['requesterUsername', 'targetUserId', 'requesterId'],
			properties:
			{
				targetUserId: { type: 'string'}, // WHO TO SENT THE NOTIFICATION TO
				requesterId: { type: 'string'}, // WHO SENT THE FRIEND REQUEST
				requesterUsername: { type: 'string'}, // USERNAME OF THE REQUESTER
			}
		},

		response:
		{
			200 : {},
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: sendFriendRequest
}

// const	sendFriendAcceptOpts = 
// {
// 	schema:
// 	{
// 		summary: '🔒 Internal - Send friend accept',
// 		tags: ['Notifications', 'Internal'],
	
// 		...withInternalAuth,

// 		body:
// 		{
// 			type: 'object',
// 			required: ['requesterId', 'accepterUsername', 'accepterId'],
// 			properties:
// 			{
// 				requesterId: {type: 'string'}, // WHO TO SENT THE NOTIFICATION TO
// 				accepterId: {type: 'string'}, // WHO ACCEPTED THE REQUEST
// 				accepterUsername: { type: 'string'}, // USERNAME OF THE ACCEPTER
// 			}
// 		},

// 		response:
// 		{
// 			200 : {},
// 			500: ErrorResponse
// 		}
// 	},

// 	preHandler: validateInternalApiKey,
// 	handler: sendFriendAccept,
// }

const	sendNowFriendsOpts = 
{
	schema:
	{
		summary: '🔒 Internal - Notify user that is now friend with another user',
		tags: ['Notifications', 'Internal'],
	
		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['user1Id', 'user2Id', 'user1Username', 'user2Username'],
			properties:
			{
				user1Id: { type: 'string'}, // USER 1 ID
				user2Id: { type: 'string'}, // USER 2 ID
				user1Username: { type: 'string'}, // USER 1 USERNAME
				user2Username: { type: 'string'}, // USER 2 USERNAME
			}
		},

		response:
		{
			200 : {},
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: sendNowFriends,
}

const	send2FaOpts = 
{
	schema:
	{
		summary: '🔒 Internal - Send 2FA code (Called by auth service during login)',
		tags: ['Notifications', 'Internal'],
	
		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['email', 'otpCode', 'language', 'expiryMinutes'],
			properties:
			{
				email: { type: 'string', format: 'email' },
				otpCode: { type: 'string' },
				language: { type: 'string' },
				expiryMinutes: { type: 'integer' }
			}
		},

		response:
		{
			200 : {},
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: send2FaCode,
}

const	getActiveUsersCountOpts = 
{
	schema:
	{
		summary: '🔒 Internal - Get number of active WebSocket connections',
		tags: ['Notifications', 'Internal'],
	
		...withInternalAuth,

		response:
		{
			200 :
			{
				type: 'object',
				properties:
				{
					activeConnections: { type: 'integer' }
				}
			},
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: getActiveUsersCount
}

const	sendChatUserAddedOpts = 
{
	schema:
	{
		summary: '🔒 Internal - Notify users that he has been added to a chat',
		tags: ['Notifications', 'Internal'],

		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['from', 'senderId', 'targetId', 'chatId'],
			properties:
			{
				from: { type: 'string' }, // Username of who added the user
				senderId: { type: 'string' }, // User ID of who added the user
				targetId: { type: 'string' }, // WHO TO SENT THE NOTIFICATION TO
				chatId: { type: 'string' }, // CHAT ID
			}
		},

		response:
		{
			200 : {},
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: sendChatUserAdded,
}

//-----------------------------ROUTES FOR GAME NOTIFICATIONS-----------------------------

const	sendGameInviteOpts = 
{
	schema:
	{
		summary: '🔒 Internal - Send game invite',
		tags: ['Notifications', 'Internal'],
	
		...withInternalAuth,

		body:
		{
			type: 'object',
			required: ['senderId', 'senderUsername', 'targetId', 'gameId', 'gameType'],
			properties:
			{
				senderId: { type: 'string'}, // WHO TO SENT THE NOTIFICATION TO
				senderUsername: { type: 'string'}, // USERNAME OF WHO SENT THE GAME INVITE
				targetId: { type: 'string'}, // WHO SENT THE GAME INVITE
				gameId: { type: 'string'}, // GAME ID
				gameType: { type: 'string', enum: availableGameTypes }, // TYPE OF THE GAME
			}
		},

		response:
		{
			200 : {},
			500: ErrorResponse
		}
	},

	preHandler: validateInternalApiKey,
	handler: sendGameInvite
}


//-----------------------------EXPORT ROUTES-----------------------------

export function	notificationRoutes(fastify)
{
	// Actual WebSocket endpoint
	fastify.get('/ws', { websocket: true }, (socket, req) =>
	{
		// if the request is invalid, reject it
		let	userId = handleNewConnection(socket, req);
		if (!userId)
			return ;

		socket.on('message', msg => {handleMessage(socket, msg, userId);});

		socket.on('close', () => {handleClose(socket, userId);});

		socket.on('error', (err) => {handleError(socket, err, userId);});
	});

	fastify.get('/active-users-count', getActiveUsersCountOpts);

	fastify.post('/send-friend-request', sendFriendRequestOpts);
	// fastify.post('/send-friend-accept', sendFriendAcceptOpts);
	fastify.post('/send-2fa-code', send2FaOpts);
	fastify.post('/send-chat-user-added', sendChatUserAddedOpts);
	fastify.post('/send-now-friends', sendNowFriendsOpts);
	fastify.post('/send-game-invite', sendGameInviteOpts);
}
