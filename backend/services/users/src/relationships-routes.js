import {
	getUserRelationships,
	getFriends,
	getIncomingRequests,
	getOutgoingRequests,
	sendFriendRequest,
	acceptFriendRequest,
	rejectFriendRequest,
	blockUser,
	unblockUser,
	cancelFriendRequest,
	removeFriend
} from './relationships-controllers.js';

import { validateInternalApiKey } from './users-help.js';

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

const	RelationshipsStatus =
{
	type: 'string',
	enum: ['pending', 'accepted', 'rejected', 'blocked'],
	errorMessage: {
		enum: 'The relationshipStatus must be one of: pending, accepted, rejected, blocked.'
	}
};

const	UserRelationship =
{
	type: 'object',
	properties:
	{
		requesterId: { type: 'string' },
		targetId: { type: 'string' },
		username: { type: 'string' },
		relationshipStatus: { ...RelationshipsStatus },
		createdAt: { type: 'string', format: 'date-time' },
		updatedAt: { type: 'string', format: 'date-time' }
	},
};

const	Friend =
{
	type: 'object',
	properties:
	{
		userId: { type: 'string' }, // still returned as userId for frontend
		username: { type: 'string' },
		language: { type: 'string' },
		friendsSince: { type: 'string', format: 'date-time' }
	},
};

const	IncomingRequest =
{
	type: 'object',
	properties:
	{
		requesterId: { type: 'string' },
		username: { type: 'string' },
		createdAt: { type: 'string', format: 'date-time' }
	},
};

//-----------------------------ROUTES PROTECTED BY JWT, THE USER PROPERTY IS ADDED IN THE GATEWAY MIDDLEWARE-----------------------------

const	getUserRelationshipsOpts =
{
	schema:
	{
		summary: 'Get all relationships',
		description: 'Get all relationships of the authenticated user. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		response:
		{
			200:
			{
				type: 'array',
				items: UserRelationship
			},
			400: ErrorResponse,
			500: ErrorResponse,
		}
	},
	preHandler: validateInternalApiKey,
	handler	: getUserRelationships
};

const	getFriendsOpts =
{
	schema:
	{
		summary: 'Get friends',
		description: 'Get only accepted friends of the authenticated user. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		response:
		{
			200:
			{
				type: 'array',
				items: Friend
			},
			400: ErrorResponse,
			500: ErrorResponse,
		}
	},
	preHandler: validateInternalApiKey,
	handler	: getFriends
};

const	getIncomingRequestsOpts =
{
	schema:
	{
		summary: 'Get incoming requests',
		description: 'Get incoming friend requests for the authenticated user. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		response:
		{
			200:
			{
				type: 'array',
				items: IncomingRequest
			},
			400: ErrorResponse,
			500: ErrorResponse,
		}
	},
	preHandler: validateInternalApiKey,
	handler	: getIncomingRequests
};

const	getOutgoingRequestsOpts =
{
	schema:
	{
		summary: 'Get outgoing requests',
		description: 'Get outgoing friend requests sent by the authenticated user. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		response:
		{
			200:
			{
				type: 'array',
				items: IncomingRequest
			},
			400: ErrorResponse,
			500: ErrorResponse,
		}
	},
	preHandler: validateInternalApiKey,
	handler	: getOutgoingRequests
};

const	sendFriendRequestOpts =
{
	schema:
	{
		summary: 'Send friend request',
		description: 'Send a friend request to another user. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['targetId'],
			properties:
			{
				targetId: { type: 'string' }
			}
		},

		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' }
				}
			},
			400: ErrorResponse,
			404: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler	: sendFriendRequest
};

const	acceptFriendRequestOpts =
{
	schema:
	{
		summary: 'Accept friend request',
		description: 'Accept a friend request from another user. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['requesterId'],
			properties:
			{
				requesterId: { type: 'string' }
			}
		},

		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' }
				}
			},
			400: ErrorResponse,
			404: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler	: acceptFriendRequest
};

const	rejectFriendRequestOpts =
{
	schema:
	{
		summary: 'Reject friend request',
		description: 'Reject a friend request from another user. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['requesterId'],
			properties:
			{
				requesterId: { type: 'string' }
			}
		},

		response:
		{
			200:
			{
				type: 'object',
				properties:
				{
					message: { type: 'string' }
				}
			},
			400: ErrorResponse,
			404: ErrorResponse,
			500: ErrorResponse
		}
	},
	preHandler: validateInternalApiKey,
	handler	: rejectFriendRequest
};

const	blockUserOpts =
{
	schema:
	{
		summary: 'Block user',
		description: 'Block another user. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['targetId'],
			properties:
			{
				targetId: { type: 'string' }
			}
		},

		response:
		{
			200:
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
	handler	: blockUser
};

const	unblockUserOpts =
{
	schema:
	{
		summary: 'Unblock user',
		description: 'Unblock a previously blocked user. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['targetId'],
			properties:
			{
				targetId: { type: 'string' }
			}
		},

		response:
		{
			200:
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
	handler	: unblockUser
};

const	cancelFriendRequestOpts =
{
	schema:
	{
		summary: 'Cancel friend request',
		description: 'Cancel an outgoing friend request. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['targetId'],
			properties:
			{
				targetId: { type: 'string' }
			}
		},

		response:
		{
			200:
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
	handler	: cancelFriendRequest
}

const	removeFriendOpts =
{
	schema:
	{
		summary: 'Remove friend',
		description: 'Remove a friend or cancel a friend request. Requires accessToken cookie for authentication.',
		tags: ['Relationships'],

		...withInternalAuth,
		...withCookieAuth,

		body:
		{
			type: 'object',
			required: ['targetId'],
			properties:
			{
				targetId: { type: 'string' }
			}
		},

		response:
		{
			200:
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
	handler	: removeFriend
};

export function	relationshipsRoutes(fastify)
{
	// GET routes
	fastify.get('/relationships', getUserRelationshipsOpts);
	fastify.get('/relationships/friends', getFriendsOpts);
	fastify.get('/relationships/requests/incoming', getIncomingRequestsOpts);
	fastify.get('/relationships/requests/outgoing', getOutgoingRequestsOpts);
	// POST routes
	fastify.post('/relationships/request', sendFriendRequestOpts);
	
	// PUT routes
	fastify.put('/relationships/accept', acceptFriendRequestOpts);
	fastify.put('/relationships/reject', rejectFriendRequestOpts);
	fastify.put('/relationships/block', blockUserOpts);
	
	// DELETE routes
	fastify.delete('/relationships/unblock', unblockUserOpts);
	fastify.delete('/relationships/removeFriend', removeFriendOpts);
	fastify.delete('/relationships/cancelFriendRequest', cancelFriendRequestOpts);
}
